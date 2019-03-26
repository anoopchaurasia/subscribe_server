let auth_token = require('../models/authToken');
let email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
var { google } = require('googleapis');
const cheerio = require('cheerio');
let TrashEmail = require("../helper/trashEmail").TrashEmail;
var FCM = require('fcm-node');
var serverKey = process.env.SERVER_KEY; //put your server key here
var fcm = new FCM(serverKey);


class Pubsub {
    static async getRecentEmail(user_id, auth, messageIDS) {
        let gmail = await Pubsub.getGoogleInstance(auth);
        messageIDS.forEach(async mids => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': mids }).catch(err => {
                console.log(err);
            });
            if (response) {
                // let header_raw = response['data']['payload']['headers'];
                // let head;
                // header_raw.forEach(data => {
                //     if (data.name == "Subject") {
                //         head = data.value
                //     }
                // });
                if (response.data.payload) {
                    let message_raw = response.data.payload.parts[0].body.data;
                    let data = message_raw;
                    buff = Buffer.from(data, 'base64');
                    text = buff.toString();
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
        let $ = cheerio.load(emailObj);
        let url = null;
        let emailInfo = {};
        $('a').each(function (i, elem) {
            let fa = $(this).text();
            let anchortext = fa.toLowerCase();
            let anchorParentText = $(this).parent().text().toLowerCase();
            if (anchortext.indexOf("unsubscribe") != -1 ||
                anchortext.indexOf("preferences") != -1 ||
                anchortext.indexOf("subscription") != -1 ||
                anchortext.indexOf("visit this link") != -1 ||
                anchortext.indexOf("do not wish to receive our mails") != -1 ||
                anchortext.indexOf("not receiving our emails") != -1) {

                url = $(this).attr().href;

            } else if (anchorParentText.indexOf("not receiving our emails") != -1 ||
                anchorParentText.indexOf("stop receiving emails") != -1 ||
                anchorParentText.indexOf("unsubscribe") != -1 ||
                anchorParentText.indexOf("subscription") != -1 ||
                anchorParentText.indexOf("preferences") != -1 ||
                anchorParentText.indexOf("mailing list") != -1 ||
                (anchortext.indexOf("click here") != -1 && anchorParentText.indexOf("mailing list") != -1) ||
                ((anchortext.indexOf("here") != -1 || anchortext.indexOf("click here") != -1) && anchorParentText.indexOf("unsubscribe") != -1) ||
                anchorParentText.indexOf("Don't want this") != -1) {
                url = $(this).attr().href;
            }
        })
        if (url != null) {
            console.log(url)
            emailInfo['user_id'] = user_id;
            emailInfo['mail_data'] = null;
            emailInfo['email_id'] = mail.id;
            emailInfo['historyId'] = mail.historyId;
            emailInfo['labelIds'] = mail.labelIds;
            emailInfo['unsubscribe'] = url;
            emailInfo['main_label'] = mail.labelIds;
            emailInfo['is_moved'] = false;
            emailInfo['is_delete'] = false;
            emailInfo['is_keeped'] = false;
            if (mail.labelIds.indexOf("TRASH") != -1) {
                emailInfo['is_trash'] = true;
            } else {
                emailInfo['is_trash'] = false;
            }
            let header_raw = mail['payload']['headers']
            header_raw.forEach(data => {
                if (data.name == "From") {
                    let from_data = data.value.indexOf("<") != -1 ? data.value.split("<")[1].replace(">", "") : data.value;
                    emailInfo['from_email_name'] = data.value;
                    emailInfo['from_email'] = from_data;
                } else if (data.name == "To") {
                    emailInfo['to_email'] = data.value;
                } else if (data.name == "Subject") {
                    emailInfo['subject'] = data.value;
                }
            });
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
                        }
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    static async sendFcmMessage (message){
        fcm.send(message, async function (err, response) {
            if (err) {
                console.log("Something has gone wrong!");
            } else {
                console.log("Successfully sent with response: ", response);
            }
        });
    }

    static async getListLabel(user_id, auth, mailList){
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

                    var result = await Pubsub.UpdateLableInsideToken(user_id,res.data.id);
                    // auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": res.data.id } }, { upsert: true }).catch(err => { console.log(err); });
                    if (result) {
                        await MoveMailFromInBOX(user_id, auth, mailList, res.data.id);
                    }
                }
            } else {
                var result = await Pubsub.UpdateLableInsideToken(user_id, lbl_id);
                // let result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": lbl_id } }, { upsert: true }).catch(err => { console.log(err); });
                if (result) {
                    await MoveMailFromInBOX(user_id, auth, mailList, lbl_id);
                }
            }
        }
    }

    static async UpdateLableInsideToken(user_id,label){
        var result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": label } }, { upsert: true }).catch(err => { console.log(err); });
        return result;
    }

    static async UpdateNewEmail(email_id,newvalues){
        await email.findOneAndUpdate({"email_id":email_id}, newvalues, { upsert: true }).catch(err => {
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
            await Pubsub.UpdateNewEmail(mailList.email_id,newvalues);
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

    static async getGoogleInstance(auth){
        return google.gmail({
            version: 'v1',
            auth: auth
        });
    }

}


exports.Pubsub = Pubsub;