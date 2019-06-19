fm.Package("com.anoop.gmail");
let TokenHandler = require("./../../../../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
fm.Class("Gmail", function(me){
    this.setMe=_me=>me=_me;

    this.Gmail = function(oauth2Client, authToken, user_id) {
        this.oauth2Client = oauth2Client;
        this.authToken = authToken;
        this.user_id = user_id;
    };

    Static.getInstanceForUser = async function(user_id) {
        const authToken = await TokenHandler.getAccessToken(user_id).catch(e => console.error(e,"80"));
        let oauth2Client = await TokenHandler.createAuthCleint();
        return new me(oauth2Client, authToken, user_id);
    };

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