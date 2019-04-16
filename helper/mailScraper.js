
'use strict'
const axios = require("axios");
const senderList = ["@accounts.google.com"]
class MailScraper {

    static async sendMailToScraper(sender,mail) {
        sender = sender.split("@")[1];
        if (senderList.includes("@" + sender)) {
            console.log(sender)
            let body = JSON.stringify(mail);
            const settings = {
                "url": "",
                "method": "POST",
                data: body,
                "headers": {
                    'Content-Type': 'application/json'
                }
            }
            // console.log(settings)
            let resp = await axios(settings).catch(e => {
                console.error(e.message, e.stack);
            });
            console.log(resp);
        }
    }
}


exports.MailScraper = MailScraper;