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

    async function getEmailDetailsAndIds(user_id, from_email,status) {
        let { emaildetail, emailids } = await me.getEmailDetailAndInfos(user_id, from_email);
        me.updateEmailDetailStatus(emaildetail._id, status);
        return emailids;
    };

    async function moveMailFromInboxMain(accessToken, user_id, folder_id, from_email,status) {
        // await OutlookHandler.updateAuthToken(user_id, folder_id);
        let emailids = await getEmailDetailsAndIds(user_id, from_email,status);
        console.log(emailids);
        let response = await Label.moveMailFromInbox(accessToken, emailids, folder_id);
        console.log("moved response", response)
        if (response) {
            await response.responses.asynForEach(async element => {
                if (element.status == 201) {
                    await me.updateEmailInfoForOutlook(element.id, element.body.id);
                }
            });
        }
    }

    async function revertMailForOutlook(accessToken, user_id, source_id,destination_id, from_email,status) {
        // await OutlookHandler.updateAuthToken(user_id, folder_id);
        let emailids = await getEmailDetailsAndIds(user_id, from_email,status);
        console.log(emailids);
        let response = await Label.reverMailForOutlook(accessToken, emailids, source_id,destination_id);
        console.log("moved response", response)
        if (response) {
            await response.responses.asynForEach(async element => {
                if (element.status == 201) {
                    await me.updateEmailInfoForOutlook(element.id, element.body.id);
                }
            });
        }
    }


    //-------------------------FROM INBOX---------------------------------------//

    Static.moveEmailFromInbox = async function (user_id, from_email) {
        let accessToken = await Outlook.getAccessToken(user_id);
        console.log(accessToken)
        let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
        let user = await me.getUserById(user_id);
        let instance = await Outlook.getOutlookInstanceForUser(user);
        let scraper = new Scraper.new(instance);
        let folder_id = await scraper.getFolderId(accessToken, user_id, link,"Unsubscribed Emails")
        console.log("came here", folder_id)
        if (folder_id != null) {
            console.log("got it", folder_id)
            return await moveMailFromInboxMain(accessToken, user_id, folder_id, from_email,"move");
        } else {
            console.log(folder_id)
            let new_folder = await Label.createFolderForOutlook(accessToken, user_id);
            if (new_folder) {
                return await moveMailFromInboxMain(accessToken, user_id, new_folder.id, from_email,"move");
            }
        }
    }


    Static.moveEmailToTrashFromInbox = async function(user_id,from_email){
        let accessToken = await Outlook.getAccessToken(user_id);
        let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
        let user = await me.getUserById(user_id);
        let instance = await Outlook.getOutlookInstanceForUser(user);
        let scraper = new Scraper.new(instance);
        let folder_id = await scraper.getFolderId(accessToken, user_id, link,"Junk Email")
        console.log("came here", folder_id)
        if (folder_id != null) {
            console.log("got it", folder_id)
            return await moveMailFromInboxMain(accessToken, user_id, folder_id, from_email,"trash");
        } else {
            console.log(folder_id)
            let new_folder = await Label.createFolderForOutlook(accessToken, user_id);
            if (new_folder) {
                return await moveMailFromInboxMain(accessToken, user_id, new_folder.id, from_email,"trash");
            }
        }
        
    }

 
    //------------------------------FROM UNSUB-------------------------------/

    Static.revertUnsubToInbox = async function(user_id,from_email){
        let accessToken = await Outlook.getAccessToken(user_id);
        let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0";
        let user = await me.getUserById(user_id);
        let instance = await Outlook.getOutlookInstanceForUser(user);
        let scraper = new Scraper(instance);
        let {source_id,destination_id} = await scraper.getTwoFolderId(accessToken,user_id,link,"Unsubscribed Emails","Inbox",null,null);
        if (source_id != null && destination_id!=null) {
            console.log("got it", source_id,destination_id)
            return await revertMailForOutlook(accessToken, user_id, source_id,destination_id, from_email,"keep");
        }
    }


    //-------------------------------FROM TRASH---------------------------------/
    
    Static.revertTrashToInbox = async function(user_id,from_email){
        let accessToken = await Outlook.getAccessToken(user_id);
        let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0";
        let user = await me.getUserById(user_id);
        let instance = await Outlook.getOutlookInstanceForUser(user);
        let scraper = new Scraper(instance);
        let {source_id,destination_id} = await scraper.getTwoFolderId(accessToken,user_id,link,"Junk Email","Inbox",null,null);
        if(source_id!=null && destination_id!=null){
            console.log("find trash to inbox ", source_id,destination_id);
            return await revertMailForOutlook(accessToken,user_id,source_id,destination_id,from_email,"keep");
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

        await Label.subscribeToNotification(token.token.access_token, user._id);
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