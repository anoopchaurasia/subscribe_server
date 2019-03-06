let {client_secret, client_id} = JSON.parse(fs.readFileSync('./client_secret.json')).installed;
let axios = require("axios");
let auth_token_model  = require('../models/authToken');
let request_payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "grant_type": 'refresh_token'
};

let settings = {
    "url": "https://www.googleapis.com/oauth2/v4/token",
    "method": "POST",
    body: body,
    "headers": {
        'Content-Type': 'application/json',
    }
}

class TokenHandler {
    static getAccessToken = async(user_id) =>{
        let authToken = await auth_token_model.findOne({ "user_id": doc.user_id }).catch(err => {
            console.error(err);
        });
        authToken.isExpired() ? await TokenHandler.refreshToken(authToken) : authToken;
    }

    static refreshToken=async (authToken)=>{
        let body = {...request_payload};
        body.refresh_token = authToken.refresh_token;
        let settingscopy = {...settings};
        settingscopy.data = body;
        let result = await axios.post(settings);
        authToken.access_token = result.access_token;
        authToken.expires_in = new Date(new Date().getTime() + result.expires_in*1000);
        await auth_token_model.updateOne({user_id: authToken.user_id}, {$set: authToken}, {upsert:1});
        return authToken;
    }

    static createAuthCleint = (token) => {
        let {client_secret, client_id, redirect_uris} = credentials.installed.client_secret;
        let OAuth2 = google.auth.OAuth2;
        let oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
        oauth2Client.credentials = token;
    }
}

