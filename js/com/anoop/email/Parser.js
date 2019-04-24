fm.Package('com.anoop.email');
fm.Class('Parser', function (me) {
    'use strict';

    this.setMe = function (_me) {
        me = _me;
    };

    Static.parse = function (str,parsed) {
        var json = typeof str === 'string' ? JSON.parse(str) : str;
        var data = parsed;
        var payload = str['payload'];
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
