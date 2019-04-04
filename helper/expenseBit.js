'use strict'
const auth_token = require('../models/authToken');
const email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
const cheerio = require('cheerio');
const Pubsub = require("../helper/pubsub").Pubsub;
const TrashEmail = require("../helper/trashEmail").TrashEmail;
class ExpenseBit {

    /*
    This function for getting Gmail Instance for another api/function.
    Using Accesstoken Infor and Credential Gmail Instance will be created.
    */
    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            oauth2Client
        });
    }

    /*
        This function for calling Watch Api for User.
        this will call gmail watch api for particular topic with given labels
    */
    static async watchapi(oauth2Client) {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
        const options = {
            userId: 'me',
            auth: oauth2Client,
            resource: {
                labelIds: ["INBOX", "CATEGORY_PROMOTIONS", "CATEGORY_PERSONAL", "UNREAD"],
                topicName: 'projects/retail-1083/topics/subscribeMail'
            }
        };
        console.log("watch called")
        let response = await gmail.users.watch(options);
        return
    }

    /*
        This function will create Unsubscribed Emails label in to gmail account and update labelId into database.
    */
    static async createEmailLabel(user_id, auth) {
        const gmail = google.gmail({ version: 'v1', auth })
        const res = await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": "Unsubscribed Emails"
            }
        });
        if (res) {
            const result = await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
            console.log(result);
        }
    }

    /*
        This function will modify Remove Labels Mail in Batch with given Parameters
    */
    static async batchModifyRemoveLabels(auth, mailIds, labels) {
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': mailIds,
                "removeLabelIds": labels
            }
        });
    }

    /*
        This function will modify Add labels Mail in Batch with given Parameters
    */
    static async batchModifyAddLabels(auth, mailIds, labels) {
        const gmail = google.gmail({ version: 'v1', auth });
        let modify = await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': mailIds,
                'addLabelIds': labels
            }
        });
        console.log(modify.status)
    }

    /*
        This function will modify Add and remove labels Mail in Batch with given Parameters
    */
    static async batchModifyAddAndRemoveLabels(auth, mailIds, addLabels, removeLabels) {
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': mailIds,
                'addLabelIds': addLabels,
                "removeLabelIds": removeLabels
            }
        });
    }

    /*
        This function will move Email from Inbox to Unsubscribed Folder.
    */
    static async MoveMailFromInBOX(user_id, auth, from_email, label) {
        let mailList = await email.find({ "from_email": from_email, "user_id": user_id }).catch(err => { console.log(err); });
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
                email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                    console.log(err);
                });
                mailIDSARRAY.push(mailList[i].email_id);
            }
            if (mailIDSARRAY.length != 0) {
                await batchModifyAddLabels(auth, mailIDSARRAY, labelarry);
                await batchModifyRemoveLabels(auth, mailIDSARRAY, ['Inbox']);
                await batchModifyRemoveLabels(auth, mailIDSARRAY, ['CATEGORY_PROMOTIONS']);
                await batchModifyRemoveLabels(auth, mailIDSARRAY, ['CATEGORY_PERSONAL']);
            }
        }
    }

    /*
        This function will revet back Moved Email to INBOX folder.
    */
    static async  MoveMailFromExpenseBit(user_id, auth, from_email, label) {
        let mailList = await email.find({ "user_id": user_id, "from_email": from_email }).catch(err => { console.log(err); });
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
                await batchModifyAddAndRemoveLabels(auth, emailIdList, allLabels, labelarry);
                await batchModifyAddLabels(auth, emailIdList, ['INBOX']);

            }
        }
    }

    /*
        This function will update batch email with give information
    */
    static async UpdateBatchEmail(oldvalue, newvalues) {
        await email.updateMany(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.log(err);
        });
    }

    /*
        This Function Will Moved All Emails To Unsubscribed Folder from Inbox
    */
    static async  MoveAllMailFromInBOX(user_id, auth, from_email, label) {
        let mailList = await email.find({ "user_id": user_id, "is_moved": false, "is_trash": false, "is_delete": false }).catch(err => { console.log(err); });
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
                await batchModifyAddLabels(auth, mailIdList, labelarry);
                await ExpenseBit.sleep(2000);
            }
        }
    }

    /*
        This function will wait for Given Time/sleep.
    */
    static async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
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
        let url = await ExpenseBit.getUrlFromEmail(emailObj);
        if (url != null) {
            console.log(url)
            let emailInfo = await ExpenseBit.createEmailInfo(user_id, url, mail);
            if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
                console.log(emailInfo.from_email)
            } else if (emailInfo) {
                try {
                    let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => {
                        console.log(err);
                    });
                    if (!doc) {
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true, "user_id": user_id }).catch(err => {
                            console.log(err);
                        });
                        await ExpenseBit.UpdateEmailInformation(emailInfo);
                        if (mailList) {
                            await Pubsub.getListLabel(user_id, auth, emailInfo);
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_trash": true, "user_id": user_id }).catch(err => { console.log(err); });
                        if (mailInfo) {
                            await TrashEmail.inboxToTrashFromExpenseBit(auth, emailInfo);
                        }
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }


    /*
        This function will check if lable or unsubscribed email folder created or not.
        if not then it will create new folder.
        and update that label id into database. using that label id moveEmail function will be called for moving mail fom Inbox.
    */
    static async getListLabel(user_id, auth, from_email, is_unscubscribe, is_remove_all) {
        const gmail = google.gmail({ version: 'v1', auth });
        const res = await gmail.users.labels.list({
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
                const response = await createAndUpdateEmailLabel(user_id, auth);
                lbl_id = response.data.id;
            } else {
                await ExpenseBit.UpdateLableInsideToken(user_id, lbl_id);
            }
            if (is_remove_all) {
                await ExpenseBit.MoveAllMailFromInBOX(user_id, auth, from_email, lbl_id);
            } else if (is_unscubscribe) {
                await ExpenseBit.MoveMailFromExpenseBit(user_id, auth, from_email, lbl_id);
            } else {
                await ExpenseBit.MoveMailFromInBOX(user_id, auth, from_email, lbl_id);
            }
        }
    }

    /*
        This function will create Unsubscribed Emails label in to gmail account and update labelId into database.
    */
    static async createAndUpdateEmailLabel(user_id, auth) {
        const gmail = google.gmail({ version: 'v1', auth })
        const res = await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": "Unsubscribed Emails"
            }
        });
        await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
        return res;
    }

    /*
    This function Updating Label id into database.(for newly created label)
    */
    static async UpdateLableInsideToken(user_id, label) {
        const result = await auth_token.updateOne({ user_id: user_id }, { $set: { "label_id": label } }, { upsert: true }).catch(err => { console.log(err); });
        return result;
    }

    /*
        This function will update email information into database.
    */
    static async UpdateEmailInformation(emailInfo) {
        await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => {
            console.log(err);
        });
    }
}

exports.ExpenseBit = ExpenseBit;