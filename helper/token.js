const fs = require("fs");
let {client_secret, client_id,redirect_uris} = JSON.parse(fs.readFileSync('./client_secret.json')).installed;
let axios = require("axios");
let auth_token_model  = require('../models/authToken');
var { google } = require('googleapis');
var gmail = google.gmail('v1');
let Request = require('request');
let request_payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uris":redirect_uris,
    "grant_type": 'refresh_token'
};



class TokenHandler {
    static  async getAccessToken(user_id){
        let authToken = await auth_token_model.findOne({ "user_id": user_id }).catch(err => {
            console.error(err);
        });
        if(authToken.expiry_date < new Date())
         {
            let authTokenInfo =  await TokenHandler.refreshToken(authToken)
            console.log("token", authTokenInfo)
            return authTokenInfo;
        }else{
            console.log("token not expire", authToken)
            return authToken;

        }
    }

    static async refreshToken(authToken){
        let body = {...request_payload};
        body.refresh_token = authToken.refresh_token;
        body = JSON.stringify(body);
        let settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            body:body,
            "headers": {
                'Content-Type': 'application/json',
                "access_type": 'offline'
            }
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                body = JSON.parse(body);
                authToken.access_token = body.access_token;
                authToken.expiry_date = new Date(new Date().getTime() + body.expires_in * 1000);
                await auth_token_model.updateOne({ user_id: authToken.user_id }, { $set: authToken }, { upsert: 1 });
                authToken.access_token = body.access_token;
                return authToken;
            }
        });
    }

    static async createAuthCleint(token){
        let {client_secret, client_id, redirect_uris} = request_payload;
        let OAuth2 = google.auth.OAuth2;
        let oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
        oauth2Client.credentials = token;
        return oauth2Client;
    }
}

exports.TokenHandler = TokenHandler;
