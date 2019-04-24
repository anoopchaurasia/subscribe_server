fm.Package('com.anoop.email');
fm.Class('Parser', function (me) {
    'use strict';

    this.setMe = function (_me) {
        me = _me;
    };

    Static.parse = function (str,payload,parsed) {
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
                timestamp: new Date(parseInt(json.date)).getTime(),
                snippet: json.snippet,
                index: json.index
            }
        }
        try {
            var data = parsed;
        } catch (e) {
            throw e.message;
        }
        return {
            payload: new Buffer(data, 'base64').toString('utf-8'),
            date: new Date(parseInt(json.internalDate)).toString(),
            history_id: json.historyId,
            timestamp: new Date(parseInt(json.internalDate)).getTime(),
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

});
