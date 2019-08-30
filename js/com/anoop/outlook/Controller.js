fm.Package("com.anoop.outlook");
fm.Import(".Outlook");
fm.Import(".Scraper");
fm.Import(".Label");
fm.Import(".ScraperMailSend");
var uniqid = require('uniqid');
const jwt = require('jsonwebtoken');
const OutlookHandler = require("./../../../../helper/outlook").Outlook;
fm.Class("Controller>com.anoop.email.BaseController", function (me, Outlook, Scraper, Label, ScraperMailSend) {
    'use strict'
    this.setMe = _me => me = _me;

    async function getEmailDetailsAndIds(user_id, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(user_id, from_email);
        // let gmailInstance = await Gmail.getInstanceForUser(user_id);
        // await Label.moveInboxToTrash(gmailInstance, emailids);
        // me.updateEmailDetailStatus(emaildetail._id, "move");
        return emailids;
    };
    //-------------------------FROM INBOX---------------------------------------//

    Static.moveEmailFromInbox = async function (user_id,from_email) {
        let accessToken = await Outlook.getAccessToken(user_id);
        console.log(accessToken)
        let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
        let user = await me.getUserById(user_id);
        let instance = await Outlook.getOutlookInstanceForUser(user);
        let scraper = new Scraper.new(instance);
        let folder_id = await scraper.getFolderId(accessToken,user_id,link)
        console.log("came here",folder_id)
        if(folder_id!=null){
            console.log("got it",folder_id)
            await OutlookHandler.updateAuthToken(user_id,folder_id);
            let emailids = await getEmailDetailsAndIds(user_id,from_email);
            let response = await Label.moveMailFromInbox(accessToken,emailids,folder_id);
            console.log("moved response",response)
            // Request(settings, async (error, response, body) => {
            //     if (error) {
            //         return console.log(error);
            //     }
            //     if (response) {
            //         let rsp = JSON.parse(response.body);
            //         await rsp.responses.asynForEach(async element => {
            //             if (element.status == 201) {
            //                 var oldvalue = {
            //                     "email_id": element.id
            //                 };
            //                 var newvalues = {
            //                     $set: {
            //                         "email_id": element.body.id
            //                     }
            //                 };
            //                 let check = await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
            //                     console.error(err.message, err.stack);
            //                 });
            //                 if (check) {
            //                     console.log(check)
            //                 }
            //             }
            //         });
            //     }
            // });
        }else{
            console.log(folder_id)
        }

    }



    Static.getOutlookUrl = async function () {
        const stateCode = uniqid() + "outlook" + uniqid();
        let oauth2 = await Outlook.getOutlookInstance();
        const returnVal = oauth2.authorizationCode.authorizeURL({
            redirect_uri: process.env.REDIRECT_URI,
            scope: process.env.APP_SCOPES,
            state: stateCode
        });
        await me.createOutlookUser(stateCode);
        return returnVal;
    }

    Static.createAndStoreToken = async function (auth_code, state) {
        let token = await Outlook.getToken(auth_code);
        let userInfo = jwt.decode(token.token.id_token);
        let user = await me.getByEmailAndClient(userInfo);
        if (user) {
            await me.removeUserByState(state);
            await me.updateExistingUserInfoOutlook(userInfo, state);
        } else {
            user = await me.getByState(state);
            await me.updateNewUserInfoOutlook(userInfo, state);
        }
        await OutlookHandler.extract_token(user, token.token.access_token, token.token.refresh_token, token.token.id_token, token.token.expires_at, token.token.scope, token.token.token_type).catch(err => {
            console.log(err);
        });
        await OutlookHandler.subscribeToNotification(token.token.access_token, user._id);
        return await me.createToken(user);
    }

    Static.setPrimaryEmail = async function (user_id, email, ipaddress) {
        await me.updateUserById({ "_id": user_id }, { $set: { primary_email: email, ipaddress } });
    }

    Static.getNotificationEmailData = async function (data) {
        await data.asynForEach(async subsc => {
            let resource = subsc.resourceData;
            let user_id = subsc.clientState;
            let message_id = resource.id;
            let link = encodeURI('https://graph.microsoft.com/v1.0/me/messages/' + message_id);
            let accessToken = await Outlook.getAccessToken(user_id);
            await Scraper.getWebhookMail(accessToken, link, user_id).catch(err => {
                console.log(err);
            });
        });
    }


    Static.extractEmail = async function (user_id) {
        let accessToken = await Outlook.getAccessToken(user_id);
        await me.scanStarted(user_id);
        let user = await me.getUserById(user_id);
        let instance = await Outlook.getOutlookInstanceForUser(user);
        let scraper = new Scraper.new(instance);
        await scraper.scrapEmail(accessToken, user_id);
        await me.scanFinished(user_id);
    }


});