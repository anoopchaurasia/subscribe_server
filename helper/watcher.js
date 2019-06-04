let isMaster = require("cluster").isMaster;
if(process.env.NODE_APP_INSTANCE ==0) {
    'use strict'
    console.log("is Master in watcher");
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
    schedule.scheduleJob('0 0 * * *',async () => { 
        console.log("scheduler called for watch api...");
        const cursor = UserModel.find().cursor();
        cursor.eachAsync(async user => {
            const authToken = await TokenHandler.getAccessToken(user._id).catch(e => console.error(e.message, e.stack));
            let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            await watchapi(oauth2Client,authToken)
        }).catch(e=> console.error("watch error",e))
        then(() => console.log('done!'))
    });
    
    /*
        This function for calling Watch Api for User.
        this will call gmail watch api for particular topic with given labels
    */
    let watchapi = async (oauth2Client,authToken) => {
        let topic = 'projects/retail-1083/topics/subscribeMail';
        if (authToken && authToken['app_version'] >= "1.2.7") {
            topic = "projects/email-cleaner-242110/topics/subscribeMail";
        }
        const options = {
            userId: 'me',
            auth: oauth2Client,
            resource: {
                labelIds: ["INBOX", "CATEGORY_PROMOTIONS","CATEGORY_PERSONAL","UNREAD"],
                topicName: topic
            }
        };
        console.log("watch api called")
        await gmail.users.watch(options).catch(er => { console.log(er.message, er.stack)});
    }
}