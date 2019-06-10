'use strict'
const AuthToken = require('../models/authoToken');
const email = require('../models/emailDetails');
const emailInformation = require('../models/emailInfo');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
const cheerio = require('cheerio');
const simpleParser = require('mailparser').simpleParser;
const fcmToken = require('../models/fcmoToken');
const TrashEmail = require("../helper/trashEmail").TrashEmail;
const FCM = require('fcm-node');
const serverKey = process.env.FCM_SERVER_KEY; //put your server key here
const fcm = new FCM(serverKey);
const Expensebit = require("../helper/expenseBit").ExpenseBit;

let user_move_mail_list = {};
let user_settimeout_const = {};

class Pubsub {

    /*
    This function is geting messageid list as parameters and getting message from gmail api and parsing that email.
    */
    static async getRecentEmail(user_id, auth, messageIDS) {
        let gmail = await google.gmail('v1');
        if (messageIDS.length != 0) {
            messageIDS.forEach(async mids => {
                let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': mids }).catch(err => {
                    console.error(err.message, err.stack, "m12");
                });
                if (response) {
                    if (response.data.payload || response.data.payload['parts']) {
                        let message_raw = response.data.payload['parts'] == undefined ? response.data.payload.body.data
                            : response.data.payload.parts[0].body.data;
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
    }


    /*
        This Function Will return Url from Email/parsed Data.
        Base On given Keyword Email subscribe link will be extracted and returning to calling function.
    */
    static async getUrlFromEmail(emailObj) {
        if (!emailObj) {
            return null;
        }
        let $ = cheerio.load(emailObj);
        let url = null;
        $('a').each(async function (i, elem) {
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
                return url;
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
                return url;
            }
        })
        return url;
    }


    /*
        This function will create Json Object from Email data for storing into database.
        based on given information email object will be created.
    */
    static async createEmailInfo(user_id, url, mail) {
        let emailInfo = {};
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
        header_raw.forEach(async data => {
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
        return emailInfo;
    }

    /*
        This Function will get url and email object. 
        using that if email is present into dtabase then doing nothing else creating new email in database.
        checking if from_email present and email moved/trash then based on that new email will be moved/trashed.
    */
    static async checkEmail(emailObj, mail, user_id, auth) {
        let url = await Pubsub.getUrlFromEmail(emailObj);
        if (url != null) {
            let emailInfo = await Pubsub.createEmailInfo(user_id, url, mail);
            if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
                return
            } else {
                try {
                    let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => {
                        console.error(err.message, err.stack, "91");
                    });
                    if (!doc) {
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "status": "move", "user_id": user_id }).catch(err => {
                            console.error(err.message, err.stack, "92");
                        });
                        await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.error(err.message, err.stack, "m13"); });
                        if (mailList) {
                            await Pubsub.getListLabel(user_id, auth, emailInfo)
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "status": "trash", "user_id": user_id }).catch(err => { console.error(err.message, err.stack, "m14"); });
                        if (mailInfo) {
                            await TrashEmail.inboxToTrashFromExpenseBit(auth, emailInfo, user_id);
                        }
                        let tokenInfo = await fcmToken.findOne({ "user_id": user_id }).catch(err => { console.error(err.message, err.stack, "m15"); });
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
                } catch (err) {
                    console.error(err.message, err.stack, "93");
                }
            }
        }
    }

    /*
        This function for sending Firebase Notification to user.
    */
    static async sendFcmMessage(message) {
        fcm.send(message, async function (err, response) {
            if (err) {
                console.error(err.message, err.stack, "m16");
            } else {
                console.log("Successfully sent with response: ", response);
            }
        });
    }



    static async getListLabelNew(user_id, auth, mailList, label) {
        await Pubsub.UpdateLableInsideToken(user_id, label);
        await Pubsub.MoveMailFromInBOX(user_id, auth, mailList, label);
    }



    /*
        This function will check if lable or unsubscribed email folder created or not.
        if not then it will create new folder.
        and update that label id into database. using that label id moveEmail function will be called for moving mail fom Inbox.
    */
    static async getListLabel(user_id, auth, mailList) {
        const gmail = google.gmail({ version: 'v1', auth });
        var res = await gmail.users.labels.list({
            userId: 'me',
        }).catch(err => {
            console.error(err.message, "94");
        });

        if (res) {
            let lbl_id = null;
            res.data.labels.forEach(lbl => {
                if (lbl.name === "Unsubscribed Emails") {
                    lbl_id = lbl.id;
                }
            });
            if (lbl_id == null) {

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



    /*
        This function Updating Label id into database.(for newly created label)
    */
    static async UpdateLableInsideToken(user_id, label) {
        const result = await AuthToken.updateOne({ user_id: user_id }, { $set: { "label_id": label } }, { upsert: true }).catch(err => { console.error(err.message, err.stack, "m18"); });
        return result;
    }

    /*
        This function will update email information into database.
    */
    static async UpdateNewEmail(email_id, newvalues) {
        let resp = await emailInformation.updateOne({ "email_id": email_id }, newvalues, { upsert: true }).catch(err => {
            console.error(err.message, err.stack, "96");
        });;
        return resp;
    }

    /*
        This function will move mail from Inbox.
    */

    static async  MoveMailFromInBOX(user_id, auth, mailList, label) {
        if (!user_id) throw new Error("?????????????????????????????, no user");
        clearTimeout(user_settimeout_const[user_id]);
        user_move_mail_list[user_id] = (user_move_mail_list[user_id] || [])
        user_move_mail_list[user_id].push(mailList.email_id);
        if (user_move_mail_list[user_id].length < 200) {
            return user_settimeout_const[user_id] = setTimeout(x => {
                if(!user_move_mail_list[user_id]) return;
                console.log(user_move_mail_list[user_id].length, user_id, "settimeout");
                Pubsub.moveFromINboxUNsub(auth, user_move_mail_list[user_id], label);
                delete user_move_mail_list[user_id];
            }, 10000);
        } else {
            console.log(user_move_mail_list[user_id].length, user_id, "settimeout200")
            Pubsub.moveFromINboxUNsub(auth, user_move_mail_list[user_id], label);
            delete user_move_mail_list[user_id];
        }

    }

    static async moveFromINboxUNsub(auth, id_list, label) {
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": "Unsubscribed Emails"
            }
        }).catch(err => {
            console.error(err.message, "95");
        });
        let datab = await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': id_list,
                'addLabelIds': [label],
                "removeLabelIds": ['INBOX', 'CATEGORY_PROMOTIONS', 'CATEGORY_PERSONAL']
            }
        }).catch(err => {
            console.error(err.message, err.stack, "98");
        });

    }

    /*

    */
    static async  deleteEmailsAndMoveToTrash(user_id, auth, from_email) {
        const gmail = google.gmail({ version: 'v1', auth });
        let mailList = await email.find({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack, "102"); });
        if (mailList) {
            mailList.forEach(async email => {
                let modifying = await gmail.users.messages.trash({
                    userId: 'me',
                    'id': email.email_id
                }).catch(err => { console.error(err.message, err.stack, "103"); });

                if (modifying) {
                    var newvalues = {
                        $set: {
                            "status": "delete",
                            "status_date": new Date()
                        }
                    };
                    await Pubsub.UpdateNewEmail(email.email_id, newvalues);
                }
            });
        }
    }


    /*
    This function for getting Gmail Instance for another api/function.
    Using Accesstoken Infor and Credential Gmail Instance will be created.
    */
    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e.message, e.stack, "m20"));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            auth: oauth2Client
        });
    }

    /*  
        this function will return google instance for give auth information.
    */
    static async getGoogleInstance(auth) {
        return google.gmail({
            version: 'v1',
            auth: auth
        });
    }

}


exports.Pubsub = Pubsub;