fm.Package("com.anoop.imap");
fm.Import(".Message");
fm.Import(".Parser")
fm.Class("Scraper>..email.BaseScraper", function (me, Message, Parser) {
    'use strict';
    this.setMe = _me => me = _me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function (myImap) {
        return me.new(myImap);
    };

    this.Scraper = function (myImap) {
        this.myImap = myImap;
        me.base(myImap.user_id);
    }
    this.start = async function (cb) {
        console.log("start")
        let { seen, unseen} = await Message.getEmailList(me.myImap.imap);
        console.log(seen, "sdsds")
        await Message.getBatchMessage(me.myImap.imap, seen, 
            async function detector({ bufferdata, atts}) {
                console.log("at")
                let emailbody = await Parser.getEmailBody(bufferdata, atts, ["READ"]);
                // console.log(parsed)
                // if (result != {} && parsed['textAsHtml'] != undefined) {
                //     let url = await getUrlFromEmail(parsed['textAsHtml']);
                //     if (url != null) {
                //         console.log(url)
                //         resolve({ "header": result, "url": url })
                //     }
                // }
                if (emailbody.header["list-unsubscribe"]) {
                    return await me.inboxToUnused(emailbody, emailbody.header["list-unsubscribe"]);
                }
                await me.handleEamil(x);
        });

    
    };

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