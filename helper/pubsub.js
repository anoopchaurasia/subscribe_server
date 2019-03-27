let auth_token = require('../models/authToken');
let email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
var { google } = require('googleapis');
const cheerio = require('cheerio');
const simpleParser = require('mailparser').simpleParser;
let fcmToken = require('../models/fcmToken');
let TrashEmail = require("../helper/trashEmail").TrashEmail;
var FCM = require('fcm-node');
var serverKey = "AAAA12xOmRA:APA91bGDj3guvTDKn6S9yQG3otsv01qEOflCJXiAwM2KgVfN7S6I8hSh0bpggjwpYMoZWuEO6lay6n3_cDldmYPb-ti-oVfexORlG3m2sgisDBCcst4v02ayWdYS6RboVYBCObo0pPL_"; //put your server key here
var fcm = new FCM(serverKey);
const Expensebit = require("../helper/expenseBit").ExpenseBit;


class Pubsub {
    static async getRecentEmail(user_id, auth, messageIDS) {
        let gmail = await Pubsub.getGoogleInstance(auth);
        messageIDS.forEach(async mids => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': mids }).catch(err => {
                console.log("no msg");
            });
            if (response) {
                if (response.data.payload) {
                    let message_raw = response.data.payload.parts[0].body.data;
                    let data = message_raw;
                    let buff = Buffer.from(data, 'base64');
                    let text = buff.toString();
                    simpleParser(text, async (err, parsed) => {
                        if (parsed) {
                            if (parsed['text']) {
                                await Pubsub.checkEmail(parsed['text'], response['data'], user_id, auth);
                            }
                            if (parsed['headerLines']) {
                                await Pubsub.checkEmail(parsed.headerLines[0].line, response['data'], user_id, auth);
                            }
                            if (parsed['textAsHtml']) {
                                await Pubsub.checkEmail(parsed['textAsHtml'], response['data'], user_id, auth);
                            }
                        }
                    });
                }
            }
        });
    }

    static async checkEmail(emailObj, mail, user_id, auth) {
        let url = await Expensebit.getUrlFromEmail(emailObj);
        if (url != null) {
            console.log(url)
            let emailInfo = await Expensebit.createEmailInfo(user_id, url, mail);
            if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
                console.log(emailInfo.from_email)
            } else {
                try {
                    let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => {
                        console.log(err);
                    });
                    if (!doc) {
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true, "user_id": user_id }).catch(err => {
                            console.log(err);
                        });
                        if (mailList) {
                            emailInfo.is_moved = true;
                            await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                            await Pubsub.getListLabel(user_id, auth, mailList)
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_delete": true, "user_id": user_id }).catch(err => { console.log(err); });
                        if (mailInfo) {
                            emailInfo.is_delete = true;
                            await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                            await Pubsub.deleteEmailsAndMoveToTrash(auth, mailList.from_email)
                        }
                        if (!mailList && !mailInfo) {
                            await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                            let tokenInfo = await fcmToken.findOne({ "user_id": user_id }).catch(err => { console.log(err); });
                            if (tokenInfo) {
                                var message = {
                                    to: tokenInfo.fcm_token,
                                    collapse_key: 'geern',
                                    notification: {
                                        title: 'New Email Newsletter',
                                        body: 'You received new newsletter in you INBOX.'
                                    }
                                };
                                await Pubsub.sendFcmMessage(message);
                            }
                        }
                        
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    static async sendFcmMessage(message) {
        // var serverKey = process.env.SERVER_KEY; //put your server key here
        // var fcm = new FCM(serverKey);
        fcm.send(message, async function (err, response) {
            if (err) {
                console.log("Something has gone wrong!");
            } else {
                console.log("Successfully sent with response: ", response);
            }
        });
    }

    static async getListLabel(user_id, auth, mailList) {
        const gmail = google.gmail({ version: 'v1', auth });
        var res = await gmail.users.labels.list({
            userId: 'me',
        }).catch(err => {
            console.log(err);
        });

        if (res) {
            let lbl_id = null;
            res.data.labels.forEach(lbl => {
                if (lbl.name === "Unsubscribed Emails") {
                    lbl_id = lbl.id;
                }
            });
            if (lbl_id == null) {
                var res = gmail.users.labels.create({
                    userId: 'me',
                    resource: {
                        "labelListVisibility": "labelShow",
                        "messageListVisibility": "show",
                        "name": "Unsubscribed Emails"
                    }
                }).catch(err => {
                    console.log(err);
                });
                if (res) {
                    var result = await Pubsub.UpdateLableInsideToken(user_id, res.data.id);
                    if (result) {
                        await Pubsub.MoveMailFromInBOX(user_id, auth, mailList, res.data.id);
                    }
                }
            } else {
                var result = await Pubsub.UpdateLableInsideToken(user_id, lbl_id);
                if (result) {
                    await Pubsub.MoveMailFromInBOX(user_id, auth, mailList, lbl_id);
                }
            }
        }
    }

    static async UpdateLableInsideToken(user_id, label) {
        var result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": label } }, { upsert: true }).catch(err => { console.log(err); });
        return result;
    }

    static async UpdateNewEmail(email_id, newvalues) {
        await email.findOneAndUpdate({ "email_id": email_id }, newvalues, { upsert: true }).catch(err => {
            console.log(err);
        });;
    }

    static async  MoveMailFromInBOX(user_id, auth, mailList, label) {
        const gmail = google.gmail({ version: 'v1', auth });
        let labelarry = [];
        labelarry[0] = label;
        if (mailList.email_id) {
            var newvalues = {
                $set: {
                    "is_moved": true
                }
            };
            await Pubsub.UpdateNewEmail(mailList.email_id, newvalues);
            await gmail.users.messages.modify({
                userId: 'me',
                'id': mailList.email_id,
                resource: {
                    'addLabelIds': labelarry,
                }
            }).catch(err => {
                console.log(err);
            });
            await gmail.users.messages.modify({
                userId: 'me',
                'id': mailList.email_id,
                resource: {
                    "removeLabelIds": ['INBOX']
                }
            });
            let tokenInfo = await fcmToken.findOne({ "user_id": user_id }).catch(err => { console.log(err); });
            if (tokenInfo) {
                var message = {
                    to: tokenInfo.fcm_token,
                    collapse_key: 'geern',
                    notification: {
                        title: 'New Email Newsletter',
                        body: 'You received new newsletter in you INBOX.'
                    }
                };
                await Pubsub.sendFcmMessage(message);
            }
        }
    }

    static async  deleteEmailsAndMoveToTrash(user_id, auth, from_email) {
        const gmail = google.gmail({ version: 'v1', auth });
        let mailList = await email.find({ "from_email": from_email, "user_id": user_id }).catch(err => { console.log(err); });
        if (mailList) {
            mailList.forEach(async email => {
                var newvalues = {
                    $set: {
                        "is_delete": true
                    }
                };
                await Pubsub.UpdateNewEmail(email.email_id, newvalues);
                await gmail.users.messages.trash({
                    userId: 'me',
                    'id': email.email_id
                }).catch(err => { console.log(err); });
            });
        }
        let tokenInfo = await fcmToken.findOne({ "user_id": user_id }).catch(err => { console.log(err); });
        if (tokenInfo) {
            var message = {
                to: tokenInfo.fcm_token,
                collapse_key: 'geern',
                notification: {
                    title: 'New Email Newsletter',
                    body: 'You received new newsletter in you INBOX.'
                }
            };
            await Pubsub.sendFcmMessage(message);
        }
    }

    static async getGmailInstance(auth) {
        let authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            auth: oauth2Client
        });
    }

    static async getGoogleInstance(auth) {
        return google.gmail({
            version: 'v1',
            auth: auth
        });
    }

}


exports.Pubsub = Pubsub;