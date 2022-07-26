fm.Package("com.anoop.outlook");
const OutlookHandler = require("./../../../../helper/outlook").Outlook;

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

    this.Outlook = function(oauth2,user) {
        this.oauth2 = oauth2;
        this.user = user;
        this.error = null;
    };

    Static.getOutlookInstance = async function(){
        return oauth2;
    }

    Static.getOutlookInstanceForUser = async function(user) {
        return new me(oauth2, user);
    };

    Static.getToken = async function(auth_code){
        let result = await oauth2.authorizationCode.getToken({
            code: auth_code,
            redirect_uri: process.env.REDIRECT_URI,
            scope: process.env.APP_SCOPES
        }).catch(err => {
            console.log(err);
            return
        });
        const token = await oauth2.accessToken.create(result);
        return token
    }

    Static.getAccessToken = async function(user_id){
        let authToken = await OutlookHandler.getAuthToken(user_id);
        return await OutlookHandler.check_Token_info(user_id, authToken);
    }

});