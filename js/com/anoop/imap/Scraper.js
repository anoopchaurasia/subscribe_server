
fm.Package("com.anoop.imap");
fm.Import(".Message");
fm.Import(".Parser");
fm.Import(".Label");
fm.Class("Scraper>..email.BaseScraper", function (me, Message, Parser, Label) {
    'use strict';
    this.setMe = _me => me = _me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function (myImap) {
        return me.new(myImap);
    };

    this.Scraper = function (myImap) {
        this.myImap = myImap;
        me.base(myImap.user._id);
    }

    Array.prototype.asyncForEach = async function (cb) {
        for (let i = 0, len = this.length; i < len; i++) {
            await cb(this[i], i, this);
        }
    };

    this.onLauchScrap = async function (cb) {
        let actions = await me.getUserActionData(me.myImap.user._id);
        if (actions && actions['last_scan_date']) {
            let { seen, unseen } = await Message.getOnLaunchSpecificEmailList(me.myImap.imap, actions.last_scan_date);
            console.log(seen.length, unseen.length, "launch scan")
            if (unseen.length != 0) {
                await mailScrap(unseen, ["UNREAD"], me.handleEamil);
            }
            if (seen.length != 0) {
                await mailScrap(seen, ["READ"], me.handleEamil);
            }
            setTimeout(async x => {
                cb && await cb();
            }, 5 * 1000);
        } else {
            await cb();
        }
    }

    this.start = async function (cb) {
        let { seen, unseen } = await Message.getEmailList(me.myImap.imap);
        console.log(seen.length, unseen.length, "sdsds")
        let obj;
        if (unseen.length != 0) {
            obj =await mailScrap(unseen, ["UNREAD"], me.handleEamil);
        }
        if (seen.length != 0) {
         let new_obj =  await mailScrap(seen, ["READ"], me.handleEamil);
         if(!obj.has_ecom){
             obj = new_obj;
         }
        }
        setTimeout(async x => {
            cb && await cb(obj);
        }, 5 * 1000);
    };
    const limit = 2000;
    this.update = async function (latestIDCB, throw_exception_on_log_no=false) {
        let { seen, unseen } = await Message.getLatestMessages(me.myImap.imap, me.myImap.user);
        let arr = [].concat(seen, unseen).sort((a, b) => a - b);
        if(throw_exception_on_log_no===true && arr.length>3) {
            throw new Error("more than limit 3");
        } 
        let is_more_than_limit = false, biggest = arr[arr.length - 1];
        if (arr.length > limit) {
            is_more_than_limit = true;
            arr = arr.slice(0, limit);
            biggest = arr[arr.length - 1];
            seen = seen.filter(x => x <= biggest)
            unseen = unseen.filter(x => x <= biggest)
        }
        latestIDCB && latestIDCB(biggest, is_more_than_limit)
        console.log(seen.length, unseen.length, me.myImap.user.email);
        if (unseen.length != 0) {
            await mailScrap(unseen, ["UNREAD"], me.handleBasedOnPastAction, false);
        }
        if (seen.length != 0) {
            await mailScrap(seen, ["READ"], me.handleBasedOnPastAction, false);
        }
    };

    async function mailScrap(unseen, labels, handleCB, is_get_body) {
        let move_list = [], trash_list = [], store_list = [];
        let has_ecom = false,amazon=false,flipkart=false;
        await Message.getBatchMessage(me.myImap.imap, unseen,
            async (parsed) => {
                
                let emailbody = await Parser.getEmailBody(parsed, labels);
                try{
                    is_get_body === false && QCStore(emailbody, labels[0].toLowerCase(), parsed)
                } catch(e) {
                    console.error(e, "Error while saving QCStore");
                }
                await handleCB(emailbody, async (data, status) => {
                    if (status == "move") {
                        move_list.push(data.email_id);
                    } else if (status == "trash") {
                        trash_list.push(data.email_id);
                    }
                });
                let match_domain = await me.sendMailToScraper(Parser.parse(emailbody, parsed, me.myImap.user), me.myImap.user,
                    async function getBodyCB(data) {
                        store_list.push(data.id);
                    }, is_get_body);
                if(has_ecom!=true){
                    has_ecom = match_domain;
                }
                if(flipkart==false && emailbody.from_email=="no-reply@flipkart.com" && emailbody.subject && emailbody.subject.match(/placed/i)){
                    flipkart = true
                }
                if(amazon==false && emailbody.from_email=="auto-confirm@amazon.in"){
                    amazon = true
                }
            }, is_get_body);
        if (store_list.length) {
            await Message.getBatchMessage(me.myImap.imap, store_list, async (parsed) => {
                let emailbody = await Parser.getEmailBody(parsed, labels);
                await me.sendMailToScraper(Parser.parse(emailbody, parsed, me.myImap.user), me.myImap.user,
                    async function getBodyCB() {
                    });
            });
        }
        trash_list.length && await Label.moveInboxToTrashAuto(me.myImap, trash_list);
        move_list.length && await Label.moveInboxToUnsubAuto(me.myImap, move_list);
        return {has_ecom,flipkart,amazon};
    }

    this.getEmaiIdsBySender = async function (sender) {
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        let nextPageToken = null, messages, error;
        let idlist = [];
        while (({ messages, error, nextPageToken } = await Message.getEmailsBySender(me.gmail, nextPageToken, formatted_date, sender))) {
            [].push.apply(idlist, messages.map(x => x.id));
            if (!nextPageToken || error) {
                error && console.error(error, "Scraper2")
                break;
            }
        }
        return idlist;
    }

    this.deleteQuickMail = async function (from_email) {
        let msgIDS = [];
        // from_email.forEach(email => {
        //     let ids = await Message.getAllEmailIdListBySender(me.myImap.imap, email);
        //     await Label.setDeleteFlag(me.myImap, ids);
        // });
        await from_email.asyncForEach(async email => {
            let ids = await Message.getAllEmailIdListBySender(me.myImap.imap, email);
            msgIDS = msgIDS.concat(ids);
        });
        await Label.setDeleteFlag(me.myImap, msgIDS);
    }


    this.scrapAll = async function (last_msgId) {
        let trackedUser = await me.getLastTrackMessageId(me.myImap.user._id);
        let { seen, unseen } = await Message.getALlEmailList(me.myImap.imap, trackedUser);
        console.log('***** Box based emails uids ******')
        console.log({ 'seen': seen.length, 'unseen': unseen.length })
        let seenAndUnseenEmails = {
            'unseen': [],
            'seen': []
        }
        unseen.reverse();
        seen.reverse();
        if (unseen.length != 0) {
            let unseenEmail = await mailScrapAndReturnEmailData(unseen, ["UNREAD"], 'unread', last_msgId);
            seenAndUnseenEmails.unseen = unseenEmail
        }
        if (seen.length != 0) {
            let seenEmail = await mailScrapAndReturnEmailData(seen, ["READ"], 'read', last_msgId);
            seenAndUnseenEmails.seen = seenEmail
        }
        return seenAndUnseenEmails;
    }


    async function mailScrapAndReturnEmailData(uids, labels, status) {
        return new Promise(async (resolve, reject) => {
            await Message.getBatchMessage(me.myImap.imap, uids, async (parsed) => {
                let emailbody = await Parser.getEmailBody(parsed, labels);
                await QCStore(emailbody, status, parsed);
            }, false);
            resolve();
        });
    }

    async function QCStore(emailbody, status, parsed) {
        await me.storEmailData({
            'from_email': emailbody.from_email||emailbody.from_email_name,
            'subject': emailbody.subject,
            'email_id': emailbody.email_id,
            'size': emailbody.size,
            'size_group': emailbody.size > 10000000 ? 10 : emailbody.size > 5000000 ? 5 : emailbody.size > 1000000 ? 1 : 0,
            'receivedDate': (emailbody.header.date && emailbody.header.date.split('Date: ')[1]) || parsed.date,
            'status': status,
            'deleted_at':null,
            'labelIds': emailbody.labelIds,
            'box_name': me.myImap.box.name
        }, me.myImap.user._id);
    }

    this.deletePreviousMessages = async function () {
        let ids = await Message.getDeleteEmailList(me.myImap.imap);
        return await Label.setDeleteFlag(me.myImap, ids);
    }


});