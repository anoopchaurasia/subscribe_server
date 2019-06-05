
let express = require('express');
let users = require('../models/user');
let auth_token = require('../models/authoToken');
let token_model = require('../models/tokeno');
let email = require('../models/emailDetails');
let emailInformation = require('../models/emailInfo');
let router = express.Router();
var uniqid = require('uniqid');
const jwt = require('jsonwebtoken');
const ExpenseBit = require("./expenseBit").ExpenseBit;
const cheerio = require('cheerio');
var Request = require('request');
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
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

    static async  MoveSingleMailFromInBOX(accessToken, emailId, label_id) {

        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + emailId + "/move"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "destinationId": label_id })
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                console.log("here")
                return
            }
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
                console.log("expired token")
                const refresh_token = token.refresh_token;
                let authToken = {};
                if (refresh_token) {
                    const newToken = await oauth2.accessToken.create({ refresh_token: refresh_token }).refresh();
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
        await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
            console.log(err);
        });
    }


    static async sendMailToBatchProcess(accessToken, mailIds, label_id) {
        console.log(mailIds.length);
        if (mailIds.length <= 0) return;
        var msgIDS = mailIds.splice(0, 18);
        var batchRequest = [];
        for (let i = 0; i < msgIDS.length; i++) {
            var settings = {
                "id": msgIDS[i],
                "url": encodeURI("/me/messages/" + msgIDS[i] + "/move"),
                "method": "POST",
                "headers": {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                "body": { "destinationId": label_id }
            }
            batchRequest.push(settings);
        }
        await Outlook.sendRequestInBatch(accessToken, batchRequest)
        return await Outlook.sendMailToBatchProcess(accessToken, mailIds, label_id);
    }

    static async sendRequestInBatch(accessToken, reqArray) {
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/$batch"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "requests": reqArray })
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (response) {
                console.log(JSON.parse(response.body))
                let rsp = JSON.parse(response.body);
                await rsp.responses.asynForEach(async element => {
                    console.log(element.status)
                    if (element.status == 201) {
                        console.log(element.body.id)
                        var oldvalue = {
                            "email_id": element.id
                        };
                        var newvalues = {
                            $set: {
                                "email_id": element.body.id
                            }
                        };
                        let check = await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                            console.error(err.message, err.stack);
                        });
                        if (check) {
                            console.log(check)
                        }
                    }
                });
            }
        });
    }




    static async getRevertMailFolderList(accessToken, user_id, link, from_email, source, dest) {
        var settings = {
            "url": link,
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                const res = JSON.parse(body);
                let length = res.value.length;
                let count = 0;
                await res.value.forEach(async folder => {
                    count++;
                    if (folder.displayName == 'Inbox') {
                        dest = folder.id;
                    } else if (folder.displayName == 'Unsubscribed Emails') {
                        source = folder.id;
                    }
                    if (dest && source) {
                        return await Outlook.RevertMailToInbox(user_id, accessToken, from_email, source, dest);
                    }
                });
                if (count == length) {
                    if (res['@odata.nextLink']) {
                        await Outlook.getRevertMailFolderList(accessToken, user_id, res['@odata.nextLink'], from_email, source, dest)
                    }
                }
            }
        });
    }

    static async getRevertTrashMailFolderList(accessToken, user_id, link, from_email, source, dest) {
        var settings = {
            "url": link,
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                const res = JSON.parse(body);
                let length = res.value.length;
                let count = 0;
                await res.value.forEach(async folder => {
                    count++;
                    if (folder.displayName == 'Inbox') {
                        dest = folder.id;
                    } else if (folder.displayName == 'Junk Email') {
                        source = folder.id;
                    }
                    if (dest && source) {
                        return await Outlook.RevertMailToInbox(user_id, accessToken, from_email, source, dest);
                    }
                });
                if (count == length) {
                    if (res['@odata.nextLink']) {
                        await Outlook.getRevertTrashMailFolderList(accessToken, user_id, res['@odata.nextLink'], from_email, source, dest)
                    }
                }
            }
        });
    }



    static async RevertMailToInbox(user_id, accessToken, from_email, source, label_id) {
        let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack); });
        let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack); });
        if (mailList) {
            let mailIDSARRAY = mailList.map(x => x.email_id);
            var oldvalue = {
                "from_email": from_email,
                "user_id": user_id
            };
            var newvalues = {
                $set: {
                    "status": "keep",
                    "status_date": new Date()
                }
            };
            await email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            });
            await Outlook.sendRevertMailToBatchProcess(accessToken, mailIDSARRAY, source, label_id)
        }
    }



    static async  sendRevertMailToBatchProcess(accessToken, mailIds, label_id) {
        console.log(mailIds.length);
        if (mailIds.length <= 0) return;
        var msgIDS = mailIds.splice(0, 18);
        var batchRequest = [];
        for (let i = 0; i < msgIDS.length; i++) {
            var settings = {
                "url": encodeURI("/me/mailFolders/" + source + "/messages/" + email_id + "/move"),
                "method": "POST",
                "headers": {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                "body": { "destinationId": label_id }
            }
            batchRequest.push(settings);
        }
        await Outlook.sendRequestInBatch(accessToken, batchRequest);
        return await Outlook.sendMailToBatchProcess(accessToken, mailIds, label_id);
    }

    static async  MoveMailFromInBOX(user_id, accessToken, from_email, label_id) {
        let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack); });
        let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack); });
        if (mailList) {
            let mailIDSARRAY = mailList.map(x => x.email_id);
            var oldvalue = {
                "from_email": from_email,
                "user_id": user_id
            };
            var newvalues = {
                $set: {
                    "status": "move",
                    "status_date": new Date()
                }
            };
            await email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            });
            return await Outlook.sendMailToBatchProcess(accessToken, mailIDSARRAY, label_id);
        }
    }





    static async trashSingleMailFromInBOX(accessToken, emailId, label_id) {
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + emailId + "/move"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "destinationId": label_id })
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                console.log("here")
            }
        });
    }

static async MoveMailToTrashFromInBOX(user_id, accessToken, from_email, label_id) {
    let mail = await email.findOne({
        from_email: from_email,
        user_id: user_id
    }).catch(err => {
        console.error(err.message, err.stack);
    });
    let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack); });
    let mailIdList = mailList.map(x => x.email_id);
    var oldvalue = {
        from_email: from_email,
        user_id: user_id
    };
    var newvalues = {
        $set: {
            "status": "trash",
            "status_date": new Date()
        }
    };
    await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
        console.error(err.message, err.stack);
    });
    await mailIdList.asynForEach(async email_id => {
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + email_id + "/move"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "destinationId": label_id })
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (response) {
                let resp = JSON.parse(response.body);
                if (resp && resp['id']) {

                    var oldvalue = {
                        "email_id": email_id,
                        "from_email_id": mail._id
                    };
                    var newvalues = {
                        $set: {
                            "email_id": resp['id']
                        }
                    };
                    await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                        console.error(err.message, err.stack);
                    });
                }
            }
        });
    });
}

static async getFolderListForScrapping(accessToken, user_id, link, emailId){
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Unsubscribed Emails') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await Outlook.MoveSingleMailFromInBOX(accessToken, emailId, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getFolderListForScrapping(accessToken, user_id, res['@odata.nextLink'], emailId)
                } else {
                    let lbl = await Outlook.createFolderOutlook(accessToken, user_id)
                    return await Outlook.MoveSingleMailFromInBOX(accessToken, emailId, lbl);
                }
            }
        }
    });
}


static async getFolderListForTrashScrapping(accessToken, user_id, link, emailId){
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Junk Email') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await Outlook.trashSingleMailFromInBOX(accessToken, emailId, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await Outlook.getFolderListForTrashScrapping(accessToken, user_id, res['@odata.nextLink'], emailId)
                }
            }
        }
    });
}

static async getFolderList(accessToken, user_id, link, from_email){
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Unsubscribed Emails') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await Outlook.MoveMailFromInBOX(user_id, accessToken, from_email, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await Outlook.getFolderList(accessToken, user_id, res['@odata.nextLink'], from_email)
                } else {
                    let lbl = await Outlook.createFolderOutlook(accessToken, user_id)
                    return await Outlook.MoveMailFromInBOX(user_id, accessToken, from_email, lbl);
                }
            }
        }
    });
}




static async getFolderListForTrash(accessToken, user_id, link, from_email){
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Junk Email') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await Outlook.MoveMailToTrashFromInBOX(user_id, accessToken, from_email, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await Outlook.getFolderListForTrash(accessToken, user_id, res['@odata.nextLink'], from_email)
                }
            }
        }
    });
}


}

exports.Outlook = Outlook;