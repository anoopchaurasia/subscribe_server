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


});