fm.Package("com.anoop.imap");
fm.Import(".Header");
const Imap = require("imap");
const simpleParser = require('mailparser').simpleParser;
fm.Class("Parser>.Message", function (me, Header) {
    this.setMe = _me => me = _me;


    Static.getEmailBody = function (bufferdata, atts, labels) {
        let header = Imap.parseHeader(bufferdata);
        console.log(header)
        for (let k in header) {
            if (Array.isArray(header[k])) header[k] = header[k][0];
        }
        let from = header.from.split(/<|>/);
        from = from.length === 1 ? from[0] : from[from.length - 2];
        return {
            header, 
            payload: bufferdata,
            email_id: atts.uid,
            labelIds: labels,
            from_email_name: header.from,
            from_email: from,
            subject: header.subject
        };
    };


});