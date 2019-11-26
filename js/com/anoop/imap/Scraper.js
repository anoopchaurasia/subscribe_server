
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

    this.onLauchScrap = async function (cb) {
        let actions = await me.getUserActionData(me.myImap.user._id);
        if (actions && actions['last_scan_date']) {
            let { seen, unseen } = await Message.getOnLaunchSpecificEmailList(me.myImap.imap, actions.last_scan_date);
            console.log(seen, unseen, "launch scan")
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
        console.log(seen, unseen, "sdsds")
        if (unseen.length != 0) {
            await mailScrap(unseen, ["UNREAD"], me.handleEamil);
        }
        if (seen.length != 0) {
            await mailScrap(seen, ["READ"], me.handleEamil);
        }
        setTimeout(async x => {
            cb && await cb();
        }, 5 * 1000);
    };

    this.update = async function (latestIDCB) {
        let { seen, unseen } = await Message.getLatestMessages(me.myImap.imap, me.myImap.user);
        latestIDCB && latestIDCB([].concat(seen, unseen).sort((a, b) => b - a)[0])
        console.log(seen, unseen, me.myImap.user.email);
        if (unseen.length != 0) {
            await mailScrap(unseen, ["UNREAD"], me.handleBasedOnPastAction);
        }
        if (seen.length != 0) {
            await mailScrap(seen, ["READ"], me.handleBasedOnPastAction);
        }
    };

    async function mailScrap(unseen, labels, handleCB) {
        await Message.getBatchMessage(me.myImap.imap, unseen,
            async (parsed) => {
                let emailbody = await Parser.getEmailBody(parsed, labels);
                await me.sendMailToScraper(Parser.parse(emailbody, parsed, me.myImap.user), me.myImap.user);
                await handleCB(emailbody, async (data, status) => {
                    if (status == "move") {
                        await Label.moveInboxToUnsubAuto(me.myImap, [data.email_id]);
                    } else if (status == "trash") {
                        await Label.moveInboxToTrashAuto(me.myImap, [data.email_id]);
                    }
                });
            })
    }

    this.getEmaiIdsBySender = async function (sender) {
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        let nextPageToken = null, messages, error;
        let idlist = [];
        while ({ messages, error, nextPageToken } = await Message.getEmailsBySender(me.gmail, nextPageToken, formatted_date, sender)) {
            [].push.apply(idlist, messages.map(x => x.id));
            if (!nextPageToken || error) {
                error && console.error(error, "Scraper2")
                break;
            }
        }
        return idlist;
    }


    this.scrapAll = async function () {
        let trackedUser = await me.getLastTrackMessageId(me.myImap.user._id);
        console.log(trackedUser)
        let { seen, unseen } = await Message.getALlEmailList(me.myImap.imap,trackedUser);
        console.log(unseen.length,seen.length)
        await scrapUnReadAllMail(unseen);
        await scrapReadAllMail(seen);
    }

    async function scrapUnReadAllMail(mailIds) {
        if (mailIds.length <= 0) return;
        console.log('************************ all emails uids ********************************')
        console.log({ 'msgids': mailIds.length })
        var msgIDS = mailIds.splice(0, 5000);
        await mailScrapAndReturnEmailData(msgIDS, ["UNREAD"],'unread');
        return scrapUnReadAllMail(mailIds);
    }

    async function scrapReadAllMail(mailIds) {
        if (mailIds.length <= 0) return;
        console.log('************************ all emails uids ********************************')
        console.log({ 'msgids': mailIds.length })
        var msgIDS = mailIds.splice(0, 5000);
        await mailScrapAndReturnEmailData(msgIDS, ["READ"],'read');
        return scrapReadAllMail(mailIds);
    }

    // this.scrapAll = async function (last_msgId) {
    //     let trackedUser = await me.getLastTrackMessageId(me.myImap.user._id);
    //     console.log(trackedUser)
    //     let { seen, unseen } = await Message.getALlEmailList(me.myImap.imap,trackedUser);
    //     console.log('************************ size based emails uids ********************************')
    //     console.log({ 'seen': seen.length, 'unseen': unseen.length })
    //     console.log(seen,unseen)
    //     let seenAndUnseenEmails = {
    //         'unseen': [],
    //         'seen': []
    //     }
    //     if (unseen.length != 0) {
    //         let unseenEmail = await mailScrapAndReturnEmailData(unseen, ["UNREAD"],'unread',last_msgId);
    //         seenAndUnseenEmails.unseen = unseenEmail
    //     }
    //     if (seen.length != 0) {
    //         let seenEmail = await mailScrapAndReturnEmailData(seen, ["READ"],'read',last_msgId);
    //         seenAndUnseenEmails.seen = seenEmail
    //     }
    //     return seenAndUnseenEmails;
    // }

    this.size = async function (smallerThan, largerThan) {
        let { seen, unseen } = await Message.getEmailListsBySize(me.myImap.imap, smallerThan, largerThan);
        console.log('************************ size based emails uids ********************************')
        console.log({ 'seen': seen.length, 'unseen': unseen.length })
        let seenAndUnseenEmails = {
            'unseen': [],
            'seen': []
        }
        if (unseen.length != 0) {
            let unseenEmail = await mailScrapAndReturnEmailData(unseen, ["UNREAD"],'unread');
            // console.log(unseenEmail);
            // console.log('hgsdfuhgsadhfgasjdfgjhasdgfjhasdgfjhasgfjhsdgfjhsdgfsh')
            seenAndUnseenEmails.unseen = unseenEmail
        }
        if (seen.length != 0) {
            let seenEmail = await mailScrapAndReturnEmailData(seen, ["READ"],'read');
            seenAndUnseenEmails.seen = seenEmail
        }
        return seenAndUnseenEmails;
    }

    this.byDate = async function (data) {
        if (data.isCustom) {
            var { seen, unseen } = await Message.getUIDByBetweenDate(me.myImap.imap, data.since, data.before);
            console.log('----');
            
        }
        else {
            var { seen, unseen } = await Message.getUIDByBeforeOrAfterParticularDate(me.myImap.imap, data.beforeOrAfter, data.date);
        }
        console.log('************************ date based emails uids ********************************')
        console.log({ 'seen': seen.length, 'unseen': unseen.length })
        let seenAndUnseenEmails = {
            'unseen': [],
            'seen': []
        }
        if (unseen.length != 0) {
            let unseenEmail = await mailScrapAndReturnEmailData(unseen, ["UNREAD"]);
            // console.log(unseenEmail);
            // console.log('hgsdfuhgsadhfgasjdfgjhasdgfjhasdgfjhasgfjhsdgfjhsdgfsh')
            seenAndUnseenEmails.unseen = unseenEmail
        }
        if (seen.length != 0) {
            let seenEmail = await mailScrapAndReturnEmailData(seen, ["READ"]);
            seenAndUnseenEmails.seen = seenEmail
        }
        return seenAndUnseenEmails;
    }

    this.getAllEmails = async function () {
        let { seen, unseen } = await Message.getAllUID(me.myImap.imap);
        console.log('************************ all emails uids ********************************')
        console.log({ 'seen': seen.length, 'unseen': unseen.length })
        let seenAndUnseenEmails = {
            'unseen': [],
            'seen': []
        }
        if (unseen.length != 0) {
            let unseenEmail = await mailScrapAndReturnEmailData(unseen, ["UNREAD"]);
            seenAndUnseenEmails.unseen = unseenEmail
        }
        if (seen.length != 0) {
            let seenEmail = await mailScrapAndReturnEmailData(seen, ["READ"]);
            seenAndUnseenEmails.seen = seenEmail
        }
        return seenAndUnseenEmails;
    }

    async function mailScrapAndReturnEmailData(uids, labels,status) {
        // return new Promise(async (resolve, reject) => {
            let emails = [];
            console.log(me.myImap.user._id)
            await Message.getBatchMessageAndReturnEmail(me.myImap.imap, uids, async (parsed) => {
                let emailbody = await Parser.getEmailBody(parsed, labels);
                me.storEmailData({
                    'from_email': emailbody.from_email,
                    'subject': emailbody.subject,
                    'email_id': emailbody.email_id,
                    'size': emailbody.size,
                    'receivedDate': emailbody.header.date.split('Date: ')[1],
                    'status':status,
                    'labelIds':emailbody.labelIds
                },me.myImap.user._id)
                // emails.push({
                //     'from_email': emailbody.from_email,
                //     'subject': emailbody.subject,
                //     'email_id': emailbody.email_id,
                //     'size': Number(emailbody.size / 1000000).toFixed(5) + "MB",
                //     'receivedDate': emailbody.header.date.split('Date: ')[1]
                // });
            })
        //     resolve(emails)
        // });
    }

});