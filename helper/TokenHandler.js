const fs = require("fs");
let {client_secret, client_id, redirect_uris} = JSON.parse(fs.readFileSync(process.env.CLIENT_CONFIG)).installed;
var { google } = require('googleapis');
let Request = require('request');
let request_payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uris":redirect_uris,
    "grant_type": 'refresh_token'
};



class TokenHandler {
    static  async getAccessToken(authToken){
        let authToken = await auth_token_model.findOne({ "user_id": user_id }).catch(err => {
            console.error(err);
        });
        if(authToken.isExpired()) {
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

    static async getTokenFromCode(code) {
        var oauth2Client = TokenHandler.createAuthCleint();
        return await oauth2Client.getToken(code).catch(e=> console.error(e));
    }

    static async verifyIdToken (token) {
        const client = new OAuth2();
        const ticket = await client.verifyIdToken({
            idToken: token.id_token,
            audience: client_id,
        });
        return ticket.getPayload();
    }

    static async createAuthCleint(){
        let {client_secret, client_id, redirect_uris} = request_payload;
        let OAuth2 = google.auth.OAuth2;
        let oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
        return oauth2Client;
    }

    static async create_or_update(token) {         
        var tokedata = {
            "access_token": token.access_token,
            "refresh_token": token.refresh_token,
            "id_token": token.id_token,
            "scope": token.scope,
            "token_type": token.token_type,
            "expiry_date": token.expiry_date,
            "user_id": user._id,
            "created_at": new Date()
        };
        await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
            console.log(err);
        });
    }
}

exports.TokenHandler = TokenHandler;
