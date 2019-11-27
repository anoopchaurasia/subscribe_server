
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

    this.onLauchScrap = async function(cb){
        let actions = await me.getUserActionData(me.myImap.user._id);
        if(actions && actions['last_scan_date']){
            let {seen,unseen} = await Message.getOnLaunchSpecificEmailList(me.myImap.imap,actions.last_scan_date);
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
        }else{
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
        latestIDCB && latestIDCB([].concat(seen, unseen).sort((a,b)=> b-a)[0])
        console.log(seen, unseen, me.myImap.user.email);
        if (unseen.length != 0) {
            await mailScrap(unseen, ["UNREAD"], me.handleBasedOnPastAction, false);
        }
        if (seen.length != 0) {
            await mailScrap(seen, ["READ"], me.handleBasedOnPastAction, false);
        }
    };

    async function mailScrap(unseen, labels, handleCB, is_get_body) {
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
            }, is_get_body)
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

});