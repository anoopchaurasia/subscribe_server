'use strict'
const express = require('express');
const user_model = require('../models/userDetail');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Pubsub = require("../helper/pubsub").Pubsub;
const router = express.Router();
const { google } = require('googleapis');
const gmail = google.gmail('v1');


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
        // var email_id = req.body.email_id;
        // var historyID = req.body.history_id;
        let userInfo = await user_model.findOne({ "email": email_id }).catch(err => { console.log(err); });
        if (userInfo) {
            let authToken = await TokenHandler.getAccessToken(userInfo._id).catch(e => console.error(e));
            let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            
            var options = {
                userId: 'me',
                'startHistoryId': historyID-2,
                auth: oauth2Client
            };
            // console.log(options)
            let res = await gmail.users.history.list(options).catch(err => { console.log(err); });
            if (res) {
                let data = res.data;
                if (data && data.history) {
                    let history = data.history;
                    let messageIDS = [];
                    // console.log(history)
                    history.forEach(async his => {
                        his.messages.forEach(async msg => {
                            messageIDS.push(msg.id)
                        });
                    });
                    if(messageIDS.length!=0){
                        // console.log(messageIDS)
                        await Pubsub.getRecentEmail(userInfo._id, oauth2Client, messageIDS);
                    }
                    response.sendStatus(200);
                }
                // else{
                //     response.sendStatus(200);
                // }
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