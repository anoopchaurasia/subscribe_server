fm.Package('com.anoop.email');
fm.Class('Parser', function (me) {
    'use strict';

    this.setMe = function (_me) {
        me = _me;
    };

    Static.parse = function (str) {
        var json = typeof str === 'string' ? JSON.parse(str) : str;
        if ((json.subject && !json.text) || json.typeList) {
            return json
        }
        if (json.text) {
            return {
                payload: json.text,
                date: new Date(parseInt(json.date)).toString(),
                history_id: json.historyId,
                subject: json.headers.Subject,
                from: json.headers.From,
                id: json.id,
                timestamp: new Date(json.date).getTime(),
                snippet: json.snippet,
                index: json.index
            }
        }

        var payload = json["payload"];
        try {
            var data = getParts(payload) || getPlainText(payload);
        } catch (e) {
            throw e.message;
        }
        return {
            payload: new Buffer(data, 'base64').toString('utf-8'),
            date: new Date(parseInt(json.internalDate)).toString(),
            history_id: json.historyId,
            timestamp: new Date(json.internalDate).getTime(),
            subject: getHeader(payload.headers, 'subject'),
            from: getHeader(payload.headers, "from"),
            id: json.id,
            snippet: json.snippet,
            index: json.index
        }
    };

    function getHeader(header, key) {
        for (var h = 0; h < header.length; h++) {
            if (header[h].name.toLowerCase() == key) {
                return header[h].value
            }
        }
    }

    function getPlainText(payload) {
        var str = "";
        var isHtmlTag;
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
        var isHtmlTag;
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
