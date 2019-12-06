'use strict'
var request = require("request");



class AppsflyerEvent {

    static async sendEventToAppsflyer(user_id,event_name,event_value) {
        var options = {
            method: 'POST',
            url: 'https://api2.appsflyer.com/inappevent/com.inbox.clean.free.gmail.unsubscribe.smart.email.fresh.mailbox',
            headers:
            {
                "authentication": 'sc96TP3rY3awNVSj2q3gka',
                'Content-Type': 'application/json'
            },
            body:
            {
                appsflyer_id: 'com.inbox.clean.free.gmail.unsubscribe.smart.email.fresh.mailbox',
                customer_user_id: user_id,
                eventName: event_name,
                eventValue: event_value,
                eventCurrency: 'USD',
                ip: '1.0.0.0',
                eventTime: new Date(),
                af_events_api: 'true'
            },
            json: true
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            console.log(body);
        });
    }
}

exports.AppsflyerEvent = AppsflyerEvent;