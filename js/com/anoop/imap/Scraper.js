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
        let { seen, unseen} = await Message.getEmailList(me.myImap.imap);
        console.log(seen, "sdsds")
        if(unseen.length!=0){
            await Message.getBatchMessage(me.myImap.imap, unseen, 
                async ( parsed) => {
                    let emailbody = await Parser.getEmailBody(parsed.header,parsed.parseBuff, parsed.uid, ["UNREAD"]);
                    await me.handleEamil(emailbody,async (data,status)=> {
                        if(status=="move"){
                            await Label.moveInboxToUnsub(me.myImap,[data.email_id]);
                        }else if(status=="trash"){
                            await Label.moveInboxToTrash(me.myImap, [data.email_id]);
                        }
                    });
            });
        }
        if(seen.length!=0){

            await Message.getBatchMessage(me.myImap.imap, seen,
                async (parsed) => {
                    let emailbody = await Parser.getEmailBody(parsed.header, parsed.parseBuff, parsed.uid, ["READ"]);
                    await me.handleEamil(emailbody,async (data, status)=> {
                        if (status == "move") {
                            await Label.moveInboxToUnsub(me.myImap, [data.email_id]);
                        } else if (status == "trash") {
                            await Label.moveInboxToTrash(me.myImap, [data.email_id]);
                        }
                    });
                });
        }

    
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