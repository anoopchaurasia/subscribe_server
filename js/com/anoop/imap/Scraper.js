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

    this.start = async function (cb) {
        console.log("start")
        let { seen, unseen } = await Message.getEmailList(me.myImap.imap);
        console.log(seen,unseen, "sdsds")
        if (unseen.length != 0) {
            await unseenMailScrap(unseen);
        }
        if (seen.length != 0) {
            await seenMailScrap(seen);
        }
    };

    this.update = async function (cb) {
        console.log("update")
        let { seen, unseen } = await Message.getLatestMessages(me.myImap.imap, me.myImap.user);
        console.log(seen, unseen)
        if (unseen.length != 0) {
            await unseenMailScrap(unseen);
        }
        if (seen.length != 0) {
            await seenMailScrap(seen);
        }
    };

    async function unseenMailScrap(unseen) {
        await Message.getBatchMessage(me.myImap.imap, unseen,
            async (parsed) => {
                let emailbody = await Parser.getEmailBody(parsed.header, parsed.parseBuff, parsed.uid, ["UNREAD"]);
                me.sendMailToScraper(Parser.parse(emailbody, parsed.uid, parsed.parseBuff),me.myImap.user);
                await me.handleEamil(emailbody, async (data, status) => {
                    if (status == "move") {
                        await Label.moveInboxToUnsubAuto(me.myImap, [data.email_id]);
                    } else if (status == "trash") {
                        // console.log("trash automaitc")
                        await Label.moveInboxToTrashAuto(me.myImap, [data.email_id]);
                    }
                });
            });
    }

    async function seenMailScrap(seen) {
        await Message.getBatchMessage(me.myImap.imap, seen,
            async (parsed) => {
                let emailbody = await Parser.getEmailBody(parsed.header, parsed.parseBuff, parsed.uid, ["READ"]);
                me.sendMailToScraper(Parser.parse(emailbody, parsed.uid, parsed.parseBuff),me.myImap.user);
                await me.handleEamil(emailbody, async (data, status) => {
                    if(status == "move") {
                        // console.log("move automaitc")
                        await Label.moveInboxToUnsubAuto(me.myImap, [data.email_id]);
                    } else if (status == "trash") {
                        // console.log("trash automaitc")
                        await Label.moveInboxToTrashAuto(me.myImap, [data.email_id]);
                    }
                });
            });
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