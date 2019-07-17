fm.Package("com.anoop.gmail");
fm.Import(".Header");
fm.Class("Parser>.Message", function (me, Header) {
    this.setMe = _me => me = _me;


    Static.getEmailBody = function (messageBodies) {
        return messageBodies.map(x => {
            let header = Header.new(x.payload.headers);
            let payload = getParts(x.payload) || getPlainText(x.payload);
            let from = header.from.split(/<|>/);
            from = from.length === 1 ? from[0] : from[from.length - 2];
            return {
                header, payload,
                email_id: x.id,
                historyId: x.historyId,
                labelIds: x.labelIds,
                from_email_name: header.from,
                from_email: from,
                to_email: x.to,
                subject: x.subject
            };
        });
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

});