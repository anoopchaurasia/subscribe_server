fm.Package("com.anoop.outlook");
let TokenHandler = require("./../../../../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');

const credentials = {
    client: {
        id: process.env.APP_ID,
        secret: process.env.APP_PASSWORD,
    },
    auth: {
        tokenHost: 'https://login.microsoftonline.com',
        authorizePath: 'common/oauth2/v2.0/authorize',
        tokenPath: 'common/oauth2/v2.0/token'
    }
};
const oauth2 = require('simple-oauth2').create(credentials);

fm.Class("Outlook", function(me){
    'use strict'
    this.setMe=_me=>me=_me;

    this.Outlook = function(oauth2Client, authToken, user_id) {
        this.oauth2Client = oauth2Client;
        this.authToken = authToken;
        this.user_id = user_id;
        this.error = null;
    };

    Static.getInstanceForUser = async function(user_id) {
        
        const authToken = await TokenHandler.getAccessToken(user_id).catch(e => console.error(e,"80"));
        let oauth2Client = await TokenHandler.createAuthCleint(authToken);
        let instace = new me(oauth2Client, authToken, user_id);
        instace.error = oauth2Client == null || authToken.isExpired ? new Error("failed auth"): null;
        return instace;
    };

    Static.getOutlookInstance = async function(){
        return oauth2;
    }

    this.getAccessToken = async function (){
       return this.authToken.access_token;
    };

    this.userInstance = function(){
        return google.gmail({
            version: 'v1',
            auth: me.oauth2Client
        });
    }
});