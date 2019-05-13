if(process.env.NODE_APP_INSTANCE ==0) {

    'use strict'
    const TokenHandler = require("./TokenHandler").TokenHandler;
    const UserModel = require('../models/user');
    const { google } = require('googleapis');
    const gmail = google.gmail('v1');
    const schedule = require('node-schedule');
    
    Array.prototype.asynForEach = async function (cb) {
        for (let i = 0, len = this.length; i < len; i++) {
            await cb(this[i]);
        }
    }
    /*
        This is schedular Function. This will be called Every Day for all user for Gmail Watch Api Request.
    */
    schedule.scheduleJob('23 * * * *',async () => { 
        console.log("scheduler called for watch api...");
        const cursor = UserModel.find().cursor();
        cursor.eachAsync(async user => {
            const authToken = await TokenHandler.getAccessToken(user._id).catch(e => console.error(e.message, e.stack));
            let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            await watchapi(oauth2Client)
        }).
        then(() => console.log('done!'))
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
        await gmail.users.watch(options).catch(er => { console.log(er.message, er.stack)});
    }
}