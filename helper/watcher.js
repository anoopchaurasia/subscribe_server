let TokenHandler = require("./token").TokenHandler;
let user_model = require('../models/userDetail');
var { google } = require('googleapis');
var gmail = google.gmail('v1');
var schedule = require('node-schedule');

schedule.scheduleJob('0 0 * * *',async () => { 
    console.log("scheduler called for watch api...");
    let users = await user_model.find().catch(e => console.error(e));
    users.forEach(async user => {
        let authToken = await TokenHandler.getAccessToken(user._id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint(authToken);
        await watchapi(oauth2Client);
    });
});

let watchapi = async (oauth2Client) => {
    var options = {
        userId: 'me',
        auth: oauth2Client,
        resource: {
            labelIds: ["INBOX", "CATEGORY_PROMOTIONS", "UNREAD"],
            topicName: 'projects/retail-1083/topics/subscribeMail'
        }
    };
    console.log("watch api called")
    let status = await gmail.users.watch(options).catch(er=>{console.log(er)});
    console.log(status)
}