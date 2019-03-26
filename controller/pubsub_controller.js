var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let user_model = require('../models/userDetail');
let TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const Pubsub = require("../helper/pubsub").Pubsub;

let fcmToken = require('../models/fcmToken');
let Request = require("request");
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio')
const simpleParser = require('mailparser').simpleParser;
var FCM = require('fcm-node');
var serverKey = process.env.SERVER_KEY; //put your server key here
var fcm = new FCM(serverKey);
var gmail = google.gmail('v1');


router.post('/getemail', async (req, response) => {
    if (!req.body || !req.body.message || !req.body.message.data) {
        return res.sendStatus(400);
    }
    const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    var content;
    try {
        content = JSON.parse(dataUtf8encoded);
        var email_id = content.emailAddress;
        var historyID = content.historyId;
        let userInfo = await user_model.findOne({ "email": email_id }).catch(err => { console.log(err); });
        if (userInfo) {
            let authToken = await TokenHandler.getAccessToken(userInfo._id).catch(e => console.error(e));
            let oauth2Client = await TokenHandler.createAuthCleint();
            oauth2Client.credentials = authToken;
            var options = {
                userId: 'me',
                'startHistoryId': historyID - 10,
                auth: oauth2Client
            };
            let res = await gmail.users.history.list(options).catch(err => { console.log(err); });
            if (res) {
                let data = res.data;
                if (data && data.history) {
                    let history = data.history;
                    let messageIDS = [];
                    history.forEach(his => {
                        his.messages.forEach(msg => {
                            messageIDS.push(msg.id)
                        });
                    });
                    await Pubsub.getRecentEmail(userInfo._id, oauth2Client, messageIDS);
                    response.sendStatus(200);
                }
            }
        } else {
            response.sendStatus(400);
        }
    } catch (ex) {
        console.error(ex)
        response.sendStatus(400);
    }
});

module.exports = router