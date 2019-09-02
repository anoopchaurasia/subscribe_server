
let express = require('express');
let users = require('../models/user');
let auth_token = require('../models/authoToken');
let email = require('../models/emailDetails');
let emailInformation = require('../models/emailInfo');
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
            console.log(err);
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
                console.log(error);
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
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
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
                        console.log(err);
                        await Outlook.updateUserInfo({ _id: user_id }, { $set: { inactive_at: new Date() } });
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
        console.log(tokedata);
        await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
            console.log(err);
        });
    }


    // static async MoveMailToTrashFromInBOX(user_id, accessToken, from_email, label_id) {
    //     let mail = await email.findOne({
    //         from_email: from_email,
    //         user_id: user_id
    //     }).catch(err => {
    //         console.error(err.message, err.stack);
    //     });

    //     let mailList = await emailInformation.find({ "from_email_id": mail._id },
    //         { "email_id": 1 }).catch(err => { console.error(err.message, err.stack) });
    //     let mailIdList = mailList.map(x => x.email_id);
    //     var oldvalue = {
    //         from_email: from_email,
    //         user_id: user_id
    //     };
    //     var newvalues = {
    //         $set: {
    //             "status": "trash",
    //             "status_date": new Date()
    //         }
    //     };
    //     await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
    //         console.error(err.message, err.stack);
    //     });
    //     await mailIdList.asynForEach(async email_id => {
    //         var settings = {
    //             "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + email_id + "/move"),
    //             "method": "POST",
    //             "headers": {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': 'Bearer ' + accessToken
    //             },
    //             "body": JSON.stringify({ "destinationId": label_id })
    //         }
    //         Request(settings, async (error, response, body) => {
    //             if (error) {
    //                 return console.log(error);
    //             }
    //             if (response) {
    //                 let resp = JSON.parse(response.body);
    //                 if (resp && resp['id']) {

    //                     var oldvalue = {
    //                         "email_id": email_id,
    //                         "from_email_id": mail._id
    //                     };
    //                     var newvalues = {
    //                         $set: {
    //                             "email_id": resp['id']
    //                         }
    //                     };
    //                     await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
    //                         console.error(err.message, err.stack);
    //                     });
    //                 }
    //             }
    //         });
    //     });
    // }

    // static async getFolderListForTrash(accessToken, user_id, link, from_email) {
    //     var settings = {
    //         "url": link,
    //         "method": "GET",
    //         "headers": {
    //             'Content-Type': 'application/json',
    //             'Authorization': 'Bearer ' + accessToken
    //         }
    //     }
    //     Request(settings, async (error, response, body) => {
    //         if (error) {
    //             return console.log(error);
    //         }
    //         if (body) {
    //             const res = JSON.parse(body);
    //             let length = res.value.length;
    //             let count = 0;
    //             await res.value.asynForEach(async folder => {
    //                 count++;
    //                 if (folder.displayName == 'Junk Email') {
    //                     var oldvalue = {
    //                         user_id: user_id
    //                     };
    //                     var newvalues = {
    //                         $set: {
    //                             "label_id": folder.id
    //                         }
    //                     };
    //                     var upsert = {
    //                         upsert: true
    //                     };
    //                     await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
    //                         console.log(err);
    //                     });
    //                     return await Outlook.MoveMailToTrashFromInBOX(user_id, accessToken, from_email, folder.id);
    //                 }
    //             });
    //             if (count == length) {
    //                 if (res['@odata.nextLink']) {
    //                     await Outlook.getFolderListForTrash(accessToken, user_id, res['@odata.nextLink'], from_email)
    //                 }
    //             }
    //         }
    //     });
    // }
}

exports.Outlook = Outlook;