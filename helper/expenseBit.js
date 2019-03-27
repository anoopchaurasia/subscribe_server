
let auth_token = require('../models/authToken');
let email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
var { google } = require('googleapis');
const cheerio = require('cheerio');
const Pubsub = require("../helper/pubsub").Pubsub;
let TrashEmail = require("../helper/trashEmail").TrashEmail;
class ExpenseBit {
    static async getGmailInstance(auth) {
        let authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            oauth2Client
        });
    }


    static async watchapi(oauth2Client) {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
        var options = {
            userId: 'me',
            auth: oauth2Client,
            resource: {
                labelIds: ["INBOX", "CATEGORY_PROMOTIONS", "UNREAD"],
                topicName: 'projects/retail-1083/topics/subscribeMail'
            }
        };
        console.log("watch called")
        await gmail.users.watch(options);
    }

    static async createEmailLabel(user_id, auth) {
        const gmail = google.gmail({ version: 'v1', auth })
        let res = await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": "Unsubscribed Emails"
            }
        });
        if (res) {
            let result = await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
            console.log(result);
        }
    }

    static async MoveMailFromInBOX(user_id, auth, from_email, label) {
        const gmail = google.gmail({ version: 'v1', auth });
        let mailList = await email.find({ "from_email": from_email, "user_id": user_id }).catch(err => {
            console.log(err);
        });
        if (mailList) {
            let allLabels = [];
            let mailLBL = mailList[0].labelIds.split(",");
            mailLBL.forEach(lblmail => {
                if (lblmail != label) {
                    allLabels.push(lblmail);
                }
            });

            let labelarry = [];
            labelarry[0] = label;
            let mailIDSARRAY = [];
            for (let i = 0; i < mailList.length; i++) {
                var oldvalue = {
                    "email_id": mailList[i].email_id
                };
                var newvalues = {
                    $set: {
                        "is_moved": true,
                        "is_keeped": false
                    }
                };
                var upsert = {
                    upsert: true
                };
                email.findOneAndUpdate(oldvalue, newvalues, upsert).catch(err => {
                    console.log(err);
                });
                mailIDSARRAY.push(mailList[i].email_id);
            }
            if (mailIDSARRAY.length != 0) {
                if (allLabels.indexOf("INBOX") > -1) {
                    await gmail.users.messages.batchModify({
                        userId: 'me',
                        resource: {
                            'ids': mailIDSARRAY,
                            'addLabelIds': labelarry,
                            "removeLabelIds": ['INBOX']
                        }
                    });
                } else {
                    await gmail.users.messages.batchModify({
                        userId: 'me',
                        resource: {
                            'ids': mailIDSARRAY,
                            'addLabelIds': labelarry
                        }
                    });
                }
            }
        }
    }

    static async  MoveMailFromExpenseBit(user_id, auth, from_email, label) {
        const gmail = google.gmail({ version: 'v1', auth });
        let mailList = await email.find({ "user_id": user_id, "from_email": from_email }).catch(err => {
            console.log(err);
        });
        if (mailList) {
            let allLabels = [];
            let mailLBL = [];
            if (mailList[0].labelIds) {
                mailLBL = mailList[0].labelIds.split(",");
            }
            mailLBL.forEach(lblmail => {
                if (lblmail != label) {
                    allLabels.push(lblmail);
                }
            });
            var oldvalue = {
                user_id: user_id,
                "from_email": from_email,
                "is_moved": true
            };
            var newvalues = {
                $set: {
                    "is_moved": false
                }
            };
            await ExpenseBit.UpdateBatchEmail(oldvalue, newvalues);
            let labelarry = [];
            labelarry[0] = label;
            let emailIdList = mailList.map(x => x.email_id);
            if (emailIdList) {
                await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': emailIdList,
                        'addLabelIds': allLabels,
                        "removeLabelIds": labelarry
                    }
                });
                await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': emailIdList,
                        "addLabelIds": ['INBOX']
                    }
                });
            }
        }
    }

    static async UpdateBatchEmail(oldvalue, newvalues) {
        await email.updateMany(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.log(err);
        });
    }

    static async  MoveAllMailFromInBOX(user_id, auth, from_email, label) {
        const gmail = google.gmail({ version: 'v1', auth });
        let mailList = await email.find({ "user_id": user_id, "is_moved": false }).catch(err => {
            console.log(err);
        });
        if (mailList) {
            var oldvalue = {
                user_id: user_id,
                "is_moved": false
            };
            var newvalues = {
                $set: {
                    "is_moved": true
                }
            };
            await ExpenseBit.UpdateBatchEmail(oldvalue, newvalues);
            let labelarry = [];
            labelarry[0] = label;
            let mailIdList = mailList.map(x => x.email_id);
            if (mailIdList) {
                await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': mailIdList,
                        'addLabelIds': labelarry,
                    }
                });
                await ExpenseBit.sleep(2000);
            }
        }
    }

    static async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    static async getUrlFromEmail(emailObj) {
        if(!emailObj){
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

    static async checkEmail(emailObj, mail, user_id, auth) {
        let url = await ExpenseBit.getUrlFromEmail(emailObj);
        if (url != null) {
            console.log(url)
            let emailInfo = await ExpenseBit.createEmailInfo(user_id, url, mail);
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
                            await ExpenseBit.UpdateEmailInformation(emailInfo);
                            await Pubsub.getListLabel(user_id, auth, mailList);
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_delete": true, "user_id": user_id }).catch(err => { console.log(err); });
                        if (mailInfo) {
                            emailInfo.is_delete = true;
                            await ExpenseBit.UpdateEmailInformation(emailInfo);
                            await TrashEmail.inboxToTrash(auth, mailList.from_email);
                        }
                        if (!mailList && !mailInfo) {
                            await ExpenseBit.UpdateEmailInformation(emailInfo);
                        }
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }
    static async getListLabel(user_id, auth, from_email, is_unscubscribe, is_remove_all) {
        const gmail = google.gmail({ version: 'v1', auth });
        let res = await gmail.users.labels.list({
            userId: 'me',
        });
        if (res) {
            let lbl_id = null;
            res.data.labels.forEach(lbl => {
                if (lbl.name === "Unsubscribed Emails") {
                    lbl_id = lbl.id;
                }
            });
            if (lbl_id == null) {
                let res = await gmail.users.labels.create({
                    userId: 'me',
                    resource: {
                        "labelListVisibility": "labelShow",
                        "messageListVisibility": "show",
                        "name": "Unsubscribed Emails"
                    }
                });
                if (res) {
                    let result = await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
                    if (result) {
                        if (is_remove_all) {
                            await ExpenseBit.MoveAllMailFromInBOX(user_id, auth, from_email, res.data.id);
                        } else if (is_unscubscribe) {
                            await ExpenseBit.MoveMailFromExpenseBit(user_id, auth, from_email, res.data.id);
                        } else {
                            await ExpenseBit.MoveMailFromInBOX(user_id, auth, from_email, res.data.id);
                        }
                    }
                }
            } else {
                let result = await ExpenseBit.UpdateLableInsideToken(user_id, lbl_id);
                if (result) {
                    if (is_remove_all) {
                        await ExpenseBit.MoveAllMailFromInBOX(user_id, auth, from_email, lbl_id);
                    } else if (is_unscubscribe) {
                        await ExpenseBit.MoveMailFromExpenseBit(user_id, auth, from_email, lbl_id);
                    } else {
                        await ExpenseBit.MoveMailFromInBOX(user_id, auth, from_email, lbl_id);
                    }
                }
            }
        }
    }

    static async UpdateLableInsideToken(user_id, label) {
        var result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": label } }, { upsert: true }).catch(err => { console.log(err); });
        return result;
    }

    static async UpdateEmailInformation(emailInfo) {
        await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => {
            console.log(err);
        });
    }
}

exports.ExpenseBit = ExpenseBit;