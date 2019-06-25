fm.Package("com.anoop.gmail");
fm.Import(".Message");
fm.Import(".Parser")
fm.Class("Scraper>...email.BaseScraper", function(me, Message, Parser){
    this.setMe=_me=>me=_me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function(gmail){
        return me.new(gmail);
    };

    me.Scraper = function(gmail){
        this.gmail = gmail;
        me.base(gmail.user_id);
    }
    this.start = async function(cb){
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
        let nextPageToken = null, messages, error;
        while({messages, error, nextPageToken} = await Message.getEmailList(me.gmail, nextPageToken, formatted_date)) {
            let messageBodies = await Message.getBatchMessage(me.gmail, messages);
            let emailbodies = await Parser.getEmailBody(messageBodies);
            await emailbodies.filter(x=> x.header["list-unsubscribe"]).asyncForEach(x=> {
                await me.inboxToUnused(x, x.header["list-unsubscribe"]);
            });
            await emailbodies.filter(x=> !x.header["list-unsubscribe"]).asyncForEach(x=> {
                await me.handleEamil(x);
            });
            if(!nextPageToken|| error){
                error && console.error(error, "Scraper1")
                cb();
                break;
            } 
        };
    };

    this.getEmaiIdsBySender = async function(sender) {
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        let nextPageToken = null, messages, error;
        let idlist = [];
        while({messages, error, nextPageToken} = await Message.getEmailsBySender(me.gmail, nextPageToken, formatted_date, sender)) {
             [].push.apply(idlist, messages.map(x=>x.id));
             if(!nextPageToken || error){
                error && console.error(error, "Scraper2")
                break;
            }  
        }
        return idlist;
    }


});