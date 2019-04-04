'use strict'
const fs = require("fs");
const {client_secret, client_id, redirect_uris} = JSON.parse(fs.readFileSync(process.env.CLIENT_CONFIG)).installed;
const { google } = require('googleapis');
const auth_token_model  = require('../models/authToken');
const axios = require('axios')
const request_payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uris":redirect_uris,
    "grant_type": 'refresh_token'
};

class TokenHandler {

    static async checkTokenExpiry(user_id) {
        let authToken = await auth_token_model.findOne({ "user_id": user_id }).catch(err => {
            console.error(err);
        });
        if (!authToken){
            return true;
        }
        if (authToken.expiry_date < new Date()) {
            // console.log("token expire")
            let authTokenInfo = await TokenHandler.refreshTokenExpiry(authToken);
            // console.log("cchecking here for token",authTokenInfo==undefined)
            return authTokenInfo==undefined;
        }
        return false
    }

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
            // console.log("invalid grant")
            return true
        });
        if(response.data && response.data['access_token']) {
            body = response.data;
            authToken.access_token = body.access_token;
            authToken.expiry_date = new Date(new Date().getTime() + body.expires_in * 1000);
            await auth_token_model.updateOne({ user_id: authToken.user_id }, { $set: authToken }, { upsert: 1 });
            authToken.access_token = body.access_token;
            return authToken;
        }
    }


    static  async getAccessToken(user_id){
        let authToken = await auth_token_model.findOne({ "user_id": user_id }).catch(err => {
            console.error(err);
        });
        if(authToken && authToken.expiry_date < new Date())
         {
            console.log("token expire")
            let authTokenInfo = await TokenHandler.refreshToken(authToken);
            return authTokenInfo;
        }else{
            // console.log("token not expire")
            return authToken;
        }
    }

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
        let response = await axios(settings).catch(e=>console.log(e));
        
        if(response.data && response.data['access_token']){
            body = response.data;
            authToken.access_token = body.access_token;
            authToken.expiry_date = new Date(new Date().getTime() + body.expires_in * 1000);
            await auth_token_model.updateOne({ user_id: authToken.user_id }, { $set: authToken }, { upsert: 1 });
            authToken.access_token = body.access_token;
            return authToken;
        }else{
            return
        }
    }

    static async createAuthCleint(token){
        let {client_secret, client_id, redirect_uris} = request_payload;
        let OAuth2 = google.auth.OAuth2;
        let oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
        oauth2Client.credentials = token;
        return oauth2Client;
    }
    static async getTokenFromCode(code) {
        var oauth2Client =await TokenHandler.createAuthCleint();
        return await oauth2Client.getToken(code).catch(e=> console.error(e));
    }

    static async verifyIdToken (token) {
        let {  client_id } = request_payload;
        const client = await TokenHandler.createAuthCleint();
        const ticket = await client.verifyIdToken({
            idToken: token.tokens.id_token,
            audience: client_id,
        });
        return ticket.getPayload();
    }


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
        await auth_token_model.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
            console.log(err);
        });
    }
}

exports.TokenHandler = TokenHandler;
