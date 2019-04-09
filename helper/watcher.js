'use strict'
const TokenHandler = require("./TokenHandler").TokenHandler;
const UserModel = require('../models/User');
const { google } = require('googleapis');
const gmail = google.gmail('v1');
const schedule = require('node-schedule');


/*
    This is schedular Function. This will be called Every Day for all user for Gmail Watch Api Request.
*/
schedule.scheduleJob('0 0 * * *',async () => { 
    console.log("scheduler called for watch api...");
    const users = await UserModel.find().catch(e => console.error(e));
    users.forEach(async user => {
        const authToken = await TokenHandler.getAccessToken(user._id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint(authToken);
        await watchapi(oauth2Client);
    });
});


/*
    This function for calling Watch Api for User.
    this will call gmail watch api for particular topic with given labels
*/
let watchapi = async (oauth2Client) => {
    const options = {
        userId: 'me',
        auth: oauth2Client,
        resource: {
            labelIds: ["INBOX", "CATEGORY_PROMOTIONS","CATEGORY_PERSONAL","UNREAD"],
            topicName: 'projects/retail-1083/topics/subscribeMail'
        }
    };
    console.log("watch api called")
    const status = await gmail.users.watch(options).catch(er=>{console.log(er)});
    console.log(status)
}