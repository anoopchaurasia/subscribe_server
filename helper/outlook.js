
let express = require('express');
let users = require('../models/user');
let auth_token = require('../models/authoToken');
var Request = require('request');

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

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
            console.error(err.message,err.stack,'updateUserInfo method');
        });
    }

    static async  createFolderOutlook(accessToken, user_id) {
        var settings = {
            "url": "https://graph.microsoft.com/v1.0/me/mailFolders",
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "displayName": "Unsubscribed Emails" })
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                console.error(error.message,error.stack,'1.createFolderOutlook method');
            }
            if (body) {
                const res = JSON.parse(body);
                if (res.id) {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": res.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(error => {
                        console.error(error.message,error.stack,'2.createFolderOutlook method');
                    });
                    return res.id;
                }
            }
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
        }, { upsert: true }).catch(error => {
            console.error(error.message,error.stack,'updateAuthToken method');
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
                        console.error(err.message, err.stack,"1.check_Token_info");
                        await Outlook.updateUserInfo({ _id: user_id, inactive_at: null }, { $set: { inactive_at: new Date() }});
                    });;
                    authToken.access_token = newToken.token.access_token;
                    authToken.expiry_date = new Date(newToken.token.expires_at);
                    let obj = {
                        "access_token": newToken.token.access_token,
                        "expiry_date": new Date(newToken.token.expires_at)
                    };
                    let tokens = await auth_token.findOneAndUpdate({ "user_id": user_id }, { $set: obj }, { upsert: true }).catch(error => {
                        console.error(error.message,error.stack,'2.check_Token_info');
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
        await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(error => {
            console.error(error.message,error.stack,'extract_token method');
        });
    }

}

exports.Outlook = Outlook;