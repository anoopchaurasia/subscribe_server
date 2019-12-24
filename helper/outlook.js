let users = require('../models/user');
let auth_token = require('../models/authoToken');

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

class Outlook {

    static async updateUserInfo(oldvalue, newvalue) {
        return await users.findOneAndUpdate(oldvalue, newvalue, { upsert: true }).catch(err => {
            console.error(err);
        });
    }

    static async getAuthToken(user_id) {
        return await auth_token.findOne({ "user_id": user_id });
    }

    static async updateAuthToken(user_id, folder_id) {
        return await auth_token.updateOne({ user_id: user_id }, {
            $set: {
                "label_id": folder_id
            }
        }, { upsert: true }).catch(err => {
            console.log(err);
        });
    }

    static async check_Token_info(user_id, token) {
        if (token) {
            const expiration = new Date(token.expiry_date);
            let accessToken;
            if (expiration > new Date()) {
                accessToken = token.access_token;
                return accessToken;
            } else {
                const refresh_token = token.refresh_token;
                let authToken = {};
                if (refresh_token) {
                    const newToken = await oauth2.accessToken.create({ refresh_token: refresh_token }).refresh().catch(async err => {
                        console.error(err.message, "outlook");
                        await Outlook.updateUserInfo({ _id: user_id, inactive_at: null }, { $set: { inactive_at: new Date() }});
                    });;
                    authToken.access_token = newToken.token.access_token;
                    authToken.expiry_date = new Date(newToken.token.expires_at);
                    let obj = {
                        "access_token": newToken.token.access_token,
                        "expiry_date": new Date(newToken.token.expires_at)
                    };
                    let tokens = await auth_token.findOneAndUpdate({ "user_id": user_id }, { $set: obj }, { upsert: true }).catch(err => {
                        console.log(err);
                    });
                    accessToken = newToken.token.access_token;
                    return accessToken;
                }
            }
        }
    }

    static async extract_token(user, access_token, refresh_token, id_token, expiry_date, scope, token_type) {
        var tokedata = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "id_token": id_token,
            "scope": scope,
            "token_type": token_type,
            "expiry_date": new Date(expiry_date),
            "user_id": user._id,
            "created_at": new Date()
        };
        // console.log(tokedata);
        await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
            console.log(err);
        });
    }

}

exports.Outlook = Outlook;