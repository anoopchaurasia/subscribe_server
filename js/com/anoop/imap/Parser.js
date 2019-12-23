fm.Package("com.anoop.imap");
fm.Import(".Header");
const Imap = require("imap");
const simpleParser = require('mailparser').simpleParser;
fm.Class("Parser>.Message", function (me, Header) {
    this.setMe = _me => me = _me;
    function parseHeaderLines(list) {
        let key_value = {};
        list.forEach(x => {
            key_value[x.key] = x.line;
        })
        return key_value;
    }

    Static.getEmailBody = function (parse, labels) {
        let header = parseHeaderLines(parse.headerLines);
        let from_email_name = parse.from.text;
        let from = parse.from.text.indexOf("<") != -1 ? parse.from.text.split("<")[1].replace(">", "") : header.from.text;
        return {
            header,
            payload: parse.html || "",
            email_id: parse.uid,
            labelIds: labels,
            from_email_name: from_email_name,
            from_email: from,
            subject: parse.subject,
            size: parse.size
        };
    };


    Static.parse = function (body, parse, user) {
        return {
            html: body.payload,
            date: new Date(parse.date).toString(),
            headers: {
                Subject: body.subject,
                From: body.from_email
            },
            history_id: parse.id,
            timestamp: new Date(parse.date).getTime(),
            subject: body.subject,
            from: body.from_email,
            id: parse.uid,
            to: user.email
        }
    };

    // Static.getEmailBody = function (header,bufferdata, atts, labels) {
    //     let from = header.from.indexOf("<") != -1 ? header.from.split("<")[1].replace(">", "") : header.from;
    //     return {
    //         header, 
    //         payload: bufferdata,
    //         email_id: atts,
    //         labelIds: labels,
    //         from_email_name: header.from,
    //         from_email: from,
    //         subject: header.subject
    //     };
    // };

    // Static.parse = function (json,id, data) {
    //     return {
    //         html: data.textAsHtml,
    //         date: new Date(json.header.date).toString(),
    //         headers:{
    //             Subject: json.header.subject,
    //             From: json.header.from
    //         },
    //         history_id: id,
    //         timestamp: new Date(json.header.date).getTime(),
    //         subject: json.header.subject,
    //         from: json.header.from,
    //         id: id,
    //         to :json.header.to
    //     }
    // }; 

});