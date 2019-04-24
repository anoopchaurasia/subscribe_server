fm.Package('com.anoop.email');
fm.Class('Parser', function (me) {
    'use strict';

    this.setMe = function (_me) {
        me = _me;
    };

    Static.parse = function (json, data) {
        var payload = json['payload'];
        return {
            payload: data,
            date: new Date(parseInt(json.internalDate)).toString(),
            history_id: json.historyId,
            timestamp: new Date(parseInt(json.internalDate)).getTime(),
            subject: getHeader(payload.headers, 'subject'),
            from: getHeader(payload.headers, "from"),
            id: json.id
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
