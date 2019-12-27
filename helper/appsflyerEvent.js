'use strict'
const https = require('https');



class AppsflyerEvent {

    static async sendEventToAppsflyer(user_id, event_name, event_value={time: Date.now()}) {

        try {
            var data = JSON.stringify({
                appsflyer_id: user_id,
                customer_user_id: user_id,
                eventName: event_name,
                eventValue: event_value,
                eventCurrency: 'USD',
                ip: '1.0.0.0',
                eventTime: new Date(),
                af_events_api: 'true'
            });
            var options = {
                host: 'api2.appsflyer.com',
                method: 'POST',
                path: '/inappevent/com.inbox.clean.free.gmail.unsubscribe.smart.email.fresh.mailbox',
                headers:
                {
                    "authentication": 'sc96TP3rY3awNVSj2q3gka',
                    'Content-Type': 'application/json'
                }
            };

            var reqPost = https.request(options, function (res) {
                console.log("response statusCode: ", res.statusCode);
                res.on('data', function (data) {
                    console.log('Posting Result: ', data.toString());
                });
            });
            reqPost.on('error', function (e) {
                console.error("here", e);
            });

            reqPost.write(data);
            reqPost.end();
        } catch (error) {
            console.log("appsflyer  =>", error);
        }

    }
}

exports.AppsflyerEvent = AppsflyerEvent;