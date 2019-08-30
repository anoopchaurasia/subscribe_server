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
        console.log("token",token);
        let userInfo = jwt.decode(token.token.id_token);
        console.log("userInfo",userInfo);
        let user = await me.getByEmailAndClient(userInfo);
        console.log("user",user);
        if (user) {
            await me.removeUserByState(state);
            await me.updateExistingUserInfoOutlook(userInfo, state);
        } else {
            user = await me.getByState(state);
            await me.updateNewUserInfoOutlook(userInfo, state);
        }
        console.log(user);
        await OutlookHandler.extract_token(user, token.token.access_token, token.token.refresh_token, token.token.id_token, token.token.expires_at, token.token.scope, token.token.token_type).catch(err => {
            console.log(err);
        });
        await OutlookHandler.subscribeToNotification(token.token.access_token, user._id);
        return await me.createToken(user);
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
        console.log(instance)
        let scraper = new Scraper.new(instance);
        console.log(accessToken,user_id)
        await scraper.scrapEmail(accessToken,user_id);
        await me.scanFinished(user_id);
    }

 
});