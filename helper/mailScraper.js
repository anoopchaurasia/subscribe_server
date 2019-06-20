
'use strict'
const senderList = ["@accounts.google.com"]
const axios = require("axios");
let companyName = ['yandex', 'uber', 'bolt', 'taxify'];
let companyNameReg = new RegExp(companyName.join("|"), 'i')
let companyNameMap = {
    bolt: "taxify"
}
class MailScraper {

    static async sendMailToScraper(mail, userId){
        mail.user_id = ("0x" + `${userId}`.slice(-8)) * 1 + 1000000000000;
        var company = (mail.from || "").match(companyNameReg);
        if (!company || !(company = company[0].trim().toLowerCase())) {
            return;
        }
        mail.company = companyNameMap[company] || company;
        await require("axios").post(process.env.ASYNC_SCRAPER_SEND_DATA_URL, { emaildata: JSON.stringify(mail) }).catch(function (err) { err && console.error(err,"121") })
    }
}

exports.MailScraper = MailScraper;
