fm.Package("com.anoop.imap");
fm.Import(".Header");
const Imap = require("imap");
const simpleParser = require('mailparser').simpleParser;
fm.Class("Parser>.Message", function (me, Header) {
    this.setMe = _me => me = _me;

    Static.getEmailBody = function (header,bufferdata, atts, labels) {
        let from = header.from.indexOf("<") != -1 ? header.from.split("<")[1].replace(">", "") : header.from;
        return {
            header, 
            payload: bufferdata,
            email_id: atts,
            labelIds: labels,
            from_email_name: header.from,
            from_email: from,
            subject: header.subject
        };
    };

    Static.parse = function (json,id, data) {
        
        return {
            payload: data,
            date: new Date(json.header.date).toString(),
            history_id: id,
            timestamp: new Date(json.header.date).getTime(),
            subject: json.header.subject,
            from: json.header.from,
            id: id,
            to :json.header.to
        }
    };  

});