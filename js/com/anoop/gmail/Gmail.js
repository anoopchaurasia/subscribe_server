fm.Package("com.anoop.gmail");
let TokenHandler = require("./../../../../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
fm.Class("Gmail", function(me){
    this.setMe=_me=>me=_me;

    this.Gmail = function(){

    };

    Static.userInstance = function(user_id){
        let oauth2Client = me.getOauth2ClientInstance(user_id);
        return google.gmail({
            version: 'v1',
            auth: oauth2Client
        });
    }

    Static.getOauth2ClientInstance = function(user_id){
        const authToken = await TokenHandler.getAccessToken(user_id).catch(e => console.error(e,"80"));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
    }
    
})