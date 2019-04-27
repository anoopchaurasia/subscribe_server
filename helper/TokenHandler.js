'use strict'
const fs = require("fs");
const {client_secret, client_id, redirect_uris} = JSON.parse(fs.readFileSync(process.env.CLIENT_CONFIG)).installed;
const { google } = require('googleapis');
const AuthToken  = require('../models/authoToken');
const axios = require('axios')
const request_payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uris":redirect_uris,
    "grant_type": 'refresh_token'
};

class TokenHandler {

    /*
        This function is for checking token expiry. if expire then it will check invalid grant or not.
        if token is ok then it will generate new one.
    */
    static async checkTokenExpiry(user_id) {
        let authToken = await AuthToken.findOne({ "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        if (!authToken){
            return true;
        }
        if (authToken.expiry_date < new Date()) {
             let authTokenInfo = await TokenHandler.refreshTokenExpiry(authToken);
            return authTokenInfo==undefined;
        }
        return false
    }



    /*
        This is for checking token expiry and grant for user
    */
    static async refreshTokenExpiry(authToken) {
        let body = { ...request_payload };
        body.refresh_token = authToken.refresh_token;
        body = JSON.stringify(body);
        const settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            data: body,
            "headers": {
                'Content-Type': 'application/json',
                "access_type": 'offline'
            }
        }
        let response = await axios(settings).catch(e=>{
            console.error(e.message, e.stack);
            return true
        });
        if(response && response.data && response.data['access_token']) {
            body = response.data;
            authToken.access_token = body.access_token;
            authToken.expiry_date = new Date(new Date().getTime() + body.expires_in * 1000);
            let obj = { 
                "access_token": body.access_token, 
                "expiry_date": new Date(new Date().getTime() + body.expires_in * 1000) 
            };
            await AuthToken.updateOne({ user_id: authToken.user_id }, { $set: obj }, { upsert: 1 });
        }
        return authToken;
    }

    /*
        This function will return accesstoken to calling api or function.
        Also check if token expire or not. based on that it will refresh the new token.
    */
    static  async getAccessToken(user_id){
        let authToken = await AuthToken.findOne({ "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        if(authToken && authToken.expiry_date < new Date())
         {
            console.log("token expire")
            let authTokenInfo = await TokenHandler.refreshToken(authToken);
            return authTokenInfo;
        }else{
            return authToken;
        }
    }


    /*
        This function Will refresh/generate new the access token based on refresh token.
        Also update that token into database.
    */
    static async refreshToken(authToken){
        console.log("came here");
        let body = {...request_payload};
        body.refresh_token = authToken.refresh_token;
        body = JSON.stringify(body);
        const settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            data:body,
            "headers": {
                'Content-Type': 'application/json',
                "access_type": 'offline'
            }
        }
        let response = await axios(settings).catch(e => console.error(e.message, e.stack));
        
        if (response && response.data && response.data['access_token']) {
            body = response.data;
            authToken.access_token = body.access_token;
            authToken.expiry_date = new Date(new Date().getTime() + body.expires_in * 1000);
            let obj = {
                "access_token": body.access_token,
                "expiry_date": new Date(new Date().getTime() + body.expires_in * 1000)
            };
            await AuthToken.updateOne({ user_id: authToken.user_id }, { $set: obj }, { upsert: 1 });
        }
        return authToken;
    }


    /*
        This function will return gmail/oauth2 client for another api or function.
    */
    static async createAuthCleint(token){
        let {client_secret, client_id, redirect_uris} = request_payload;
        let OAuth2 = google.auth.OAuth2;
        let oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
        oauth2Client.credentials = token;
        return oauth2Client;
    }

  
    static async getTokenFromCode(code) {
        var oauth2Client =await TokenHandler.createAuthCleint();
        return await oauth2Client.getToken(code).catch(e => console.error(e.message, e.stack));
    }

    /*
        This function will verify id token and get payload for user
    */
    static async verifyIdToken (token) {
        let {  client_id } = request_payload;
        const client = await TokenHandler.createAuthCleint();
        const ticket = await client.verifyIdToken({
            idToken: token.tokens.id_token,
            audience: client_id,
        });
        return ticket.getPayload();
    }

    /*
        This function will update or create Token information Into database.
    */
    static async create_or_update(user,token) {         
        const tokedata = {
            "access_token": token.access_token,
            "refresh_token": token.refresh_token,
            "id_token": token.id_token,
            "scope": token.scope,
            "token_type": token.token_type,
            "expiry_date": token.expiry_date,
            "user_id": user._id,
            "created_at": new Date()
        };
        await AuthToken.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
            console.error(err.message, err.stack);
        });
    }
}

exports.TokenHandler = TokenHandler;
