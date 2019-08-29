fm.Package("com.anoop.outlook");
fm.Import(".Header");
fm.Class("Parser>.Message", function (me, Header) {
    'use strict'
    this.setMe = _me => me = _me;


    Static.parse = function(json, user_id, toEmail) {
        return {
            html: json.body.content,
            date: new Date(json.receivedDateTime).toString(),
            headers: {
                Subject: json.subject,
                From: json.from.emailAddress.address
            },
            history_id: json.id,
            timestamp: new Date(json.receivedDateTime).getTime(),
            subject: json.subject,
            from: json.from.emailAddress.address,
            id: json.id,
            to: toEmail
        }
    };


    Static.getEmailBody = function (messageBodies) {
        return messageBodies.map(x => {
            let header = Header.new(x.payload.headers);
            let payload = new Buffer(getParts(x.payload) || getPlainText(x.payload), 'base64').toString('utf-8');
            let from = header.from.split(/<|>/);
            from = from.length === 1 ? from[0] : from[from.length - 2];
            return {
                header, payload,
                email_id: x.id,
                historyId: x.historyId,
                labelIds: x.labelIds,
                date: new Date(parseInt(x.internalDate)).toString(),
                from_email_name: header.from,
                from_email: from,
                to_email: header.to,
                subject: header.subject
            };
        });
    };

    Static.parseForScraper = function(messages){
        return getEmailBody(messages).map(x=>{
            x.from = x.from_email,
            x.history_id = x.historyId;
            x.timestamp = x.date;
            x.id = x.email_id;
            return x;
        })
    };

    function getPlainText(payload) {
        var str = "";
        if (payload.parts) {
            for (var i = 0; i < payload.parts.length; i++) {
                str += getPlainText(payload.parts[i]);
            };
        }
        if (payload.mimeType == "text/plain") {
            return payload["body"]["data"];
        }
        return str;
    }
    function getParts(payload) {
        var str = "";
        if (payload.parts) {
            for (var i = 0; i < payload.parts.length; i++) {
                if (payload.mimeType == "multipart/alternative" && payload.parts[i].mimeType != 'text/html') continue;
                str += getParts(payload.parts[i]);
            };
        } else if ((payload.mimeType == "text/html")) {
            return payload["body"]["data"];
        }
        return str;
    }

    Static.parse = function (messages) {
        return me.getEmailBody(messages).map(x=>{
            return {
                html: x.payload,
                date: x.date,
                headers:{
                    Subject: x.subject,
                    From: x.from_email
                },
                history_id: x.historyId,
                subject: x.subject,
                from: x.from_email,
                id: x.email_id,
                to :x.to_email
            }
        });
        
    };  

});