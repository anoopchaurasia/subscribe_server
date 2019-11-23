fm.Package("com.anoop.outlook");
fm.Import(".Message");
fm.Import(".Parser");
fm.Import(".Label");
fm.Class("ScraperMailSend>..email.BaseScraper", function (me, Message, Parser, Label) {
    'use strict';
    this.setMe = _me => me = _me;
    Static.APPROX_TWO_MONTH_IN_MS = eval(process.env.APPROX_TWO_MONTH_IN_MS);
    Static.getInstanceForUser = async function (myImap) {
        return me.new(myImap);
    };

    this.ScraperMailSend = function (gmail) {
        this.gmail = gmail;
        me.base(gmail.user_id);
    }

    this.start = async function (cb) {
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
        let nextPageToken = null, messages, error;
        while({messages, error, nextPageToken} = await Message.getAllEmailList(me.gmail, nextPageToken, formatted_date)) {
            let messageBodies = await Message.getBatchMessage(me.gmail, messages);
            messageBodies.forEach(emailbody=> cb(com.anoop.gmail.Parser.parse([emailbody])));
            if(!nextPageToken) break;
        };
    }

    this.getEmaiIdsBySender = async function (sender, cb) {
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        let nextPageToken = null, messages, error;
        let idlist = [];
        while ({ messages, error, nextPageToken } = await Message.getEmailsBySender(me.gmail, nextPageToken, formatted_date, sender)) {
            let messageBodies = await Message.getBatchMessage(me.gmail, messages);
            let emailbodies = await Parser.getEmailBody(messageBodies);
            emailbodies.forEach(emailbody=> cb(emailbody));
            if(!nextPageToken) break;
        }
    };

});