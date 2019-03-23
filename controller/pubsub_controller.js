var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let user_model = require('../models/userDetail');
let TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
let fcmToken = require('../models/fcmToken');
let Request = require("request");
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio')
const simpleParser = require('mailparser').simpleParser;
var FCM = require('fcm-node');
var serverKey = process.env.SERVER_KEY; //put your server key here
var fcm = new FCM(serverKey);
var gmail = google.gmail('v1');


router.post('/getemail', async (req, response) => {
    if (!req.body || !req.body.message || !req.body.message.data) {
        return res.sendStatus(400);
    }
    const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    var content;
    try {
        content = JSON.parse(dataUtf8encoded);
        var email_id = content.emailAddress;
        var historyID = content.historyId;
        let userInfo = await user_model.findOne({ "email": email_id }).catch(err => { console.log(err); });
        if (userInfo) {
            let authToken = await TokenHandler.getAccessToken(userInfo._id).catch(e => console.error(e));
            let oauth2Client = await TokenHandler.createAuthCleint();
            oauth2Client.credentials = authToken;
            var options = {
                userId: 'me',
                'startHistoryId': historyID - 10,
                auth: oauth2Client
            };
            let res = await gmail.users.history.list(options).catch(err => { console.log(err); });
            if (res) {
                let data = res.data;
                if (data && data.history) {
                    let history = data.history;
                    let messageIDS = [];
                    history.forEach(his => {
                        his.messages.forEach(msg => {
                            messageIDS.push(msg.id)
                        });
                    });
                    await getRecentEmail(userInfo._id, oauth2Client, messageIDS);
                    response.sendStatus(200);
                }
            }
        } else {
            response.sendStatus(400);
        }
    } catch (ex) {
        console.error(ex)
        response.sendStatus(400);
    }
});

async function getRecentEmail(user_id, auth, messageIDS) {
    messageIDS.forEach(async mids => {
        let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': mids }).catch(err => {
            console.log(err);
        });
        if (response) {
            let header_raw = response['data']['payload']['headers'];
            let head;
            header_raw.forEach(data => {
                if (data.name == "Subject") {
                    head = data.value
                }
            });
            if (response.data.payload) {
                let message_raw = response.data.payload.parts[0].body.data;
                let data = message_raw;
                buff = Buffer.from(data, 'base64');
                text = buff.toString();
                simpleParser(text, async (err, parsed) => {
                    if (parsed) {
                        if (parsed['text']) {
                            await Expensebit.checkEmail(parsed['text'], response['data'], user_id, auth);
                        }
                        if (parsed['headerLines']) {
                            await Expensebit.checkEmail(parsed.headerLines[0].line, response['data'], user_id, auth);
                        }
                        if (parsed['textAsHtml']) {
                            await Expensebit.checkEmail(parsed['textAsHtml'], response['data'], user_id, auth);
                        }
                    }
                });
            }
        }
    });
}



let checkEmail = async (emailObj, mail, user_id, auth) => {
    $ = cheerio.load(emailObj)
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
        console.log(url);
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = null;
        emailInfo['email_id'] = mail.id;
        emailInfo['historyId'] = mail.historyId;
        emailInfo['labelIds'] = mail.labelIds;
        emailInfo['unsubscribe'] = url;
        emailInfo['is_moved'] = false;
        emailInfo['is_delete'] = false;
        emailInfo['is_keeped'] = false;
        if (mail.labelIds.indexOf("TRASH") != -1) {
            emailInfo['is_trash'] = true;
        } else {
            emailInfo['is_trash'] = false;
        }
        header_raw = mail['payload']['headers']
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
        try {
            let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => { console.log(err); });
            if (!doc) {
                let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true, "user_id": user_id }).catch(err => { console.log(err); });
                if (mailList) {
                    console.log("successfully moved to folder unscribe");
                    emailInfo.is_moved = true;
                    await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                    await getListLabel(user_id, auth, mailList)
                }
                let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_delete": true, "user_id": user_id }).catch(err => { console.log(err); });
                if (mailInfo) {
                    emailInfo.is_delete = true;
                    await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                    console.log("successfully moved to folder delete");
                    await deleteEmailsAndMoveToTrash(user_id, auth, mailList.from_email)
                }
                if (!mailList && !mailInfo) {
                    await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
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
                    await sendFcmMessage(message);
                }
            }
        } catch (err) {
            console.log(err)
        }
    }
}


let getListLabel = async (user_id, auth, mailList) => {
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
                var result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": res.data.id } }, { upsert: true }).catch(err => { console.log(err); });
                if (result) {
                    await MoveMailFromInBOX(user_id, auth, mailList, res.data.id);
                }
            }
        } else {
            let result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": lbl_id } }, { upsert: true }).catch(err => { console.log(err); });
            if (result) {
                await MoveMailFromInBOX(user_id, auth, mailList, lbl_id);
            }
        }
    }
}



async function MoveMailFromInBOX(user_id, auth, mailList, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    let labelarry = [];
    labelarry[0] = label;
    if (mailList.email_id) {
        var oldvalue = {
            "email_id": mailList.email_id
        };
        var newvalues = {
            $set: {
                "is_moved": true
            }
        };
        var upsert = {
            upsert: true
        };
        await email.findOneAndUpdate(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });;
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
            'id': oneEmail.email_id,
            resource: {
                "removeLabelIds": ['INBOX']
            }
        });
    }
}


async function deleteEmailsAndMoveToTrash(user_id, auth, from_email) {
    const gmail = google.gmail({ version: 'v1', auth });
    let mailList = await email.find({ "from_email": from_email, "user_id": user_id }).catch(err => { console.log(err); });
    if (mailList) {
        mailList.forEach(async email => {
            var oldvalue = {
                email_id: email.email_id
            };
            var newvalues = {
                $set: {
                    "is_delete": true
                }
            };
            var upsert = {
                upsert: true
            };
            await email.findOneAndUpdate(oldvalue, newvalues, upsert).catch(err => { console.log(err); });
            await gmail.users.messages.trash({
                userId: 'me',
                'id': email.email_id
            }).catch(err => { console.log(err); });
        });
    }
}

let sendFcmMessage = async (message) => {
    fcm.send(message, async function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}

module.exports = router