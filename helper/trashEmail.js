'use strict'
const email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
const GmaiilApi = require("../helper/gmailApis").GmailApis;
class TrashEmail {

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
            auth: oauth2Client
        });
    }

    /*
        This function for Updating Is_trash Label for database.
        thsi will update email object with is_trash value based on parameters for trashe email data/list.
    */
    static async addTrashFromLabel(emailInfo, trash_value = true) {
        emailInfo.forEach(async email_id => {
            console.log(email_id)
            var oldvalue = {
                email_id: email_id
            };
            var newvalues = {
                $set: {
                    "is_trash": trash_value
                }
            };
            await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
        });
    }

    /*
        This function for Updating Is_trash Label for database.
        thsi will update email object with is_trash=false for untrash email done by one.
    */
    static async removeTrashFromLabel(emailInfo, trash_value = true) {
        var oldvalue = {
            email_id: emailInfo.email_id
        };
        var newvalues = {
            $set: {
                "is_trash": trash_value
            }
        };
        await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.log(err);
        });
    }


    /*
        This function for Moving Mail form INbox To trash Folder.
        Using From_email getting all Emails and Getting EmailID list from Emails.
        Using That EmailId List Changing Trash Lable for all mail in Batch.
    */
    static async inboxToTrash(authToken, bodyData) {
        let mailList = await email.find({
            from_email: bodyData.from_email,
            user_id: authToken.user_id
        }).catch(err => {
            console.log(err);
        });
        let mailIdList = mailList.map(x => x.email_id);
        if (mailIdList) {
            let modifying = await GmaiilApi.trashEmailAPi(authToken, mailIdList);
            if (modifying) {
                await TrashEmail.addTrashFromLabel(mailIdList);
            }
        }
    }


    /*
        This Function For Moving Mail from inbox to Trash folder.
        This will move one email at a time. and changed is_trash value into database same time.
    */
    static async inboxToTrashFromExpenseBit(authToken, emailInfo) {
        if (emailInfo.email_id) {
            let modifying = await GmaiilApi.trashEmailAPi(authToken, emailInfo.email_id);
            if (modifying) {
                var oldvalue = {
                    email_id: emailInfo.email_id
                };
                var newvalues = {
                    $set: {
                        "is_trash": true
                    }
                };
                await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                    console.log(err);
                });
            }
        }
    }


    /*
        This function Will moved/revert Mail from Trash folder.
        Based On from_email Untrashing email list from trash folder.
        and updating is_trash value to false into database.
    */
    static async revertMailFromTrash(authToken, bodyData) {
        let mailList = await email.find({
            from_email: bodyData.from_email,
            user_id: authToken.user_id,
            is_trash: true,
            is_delete: false
        }).catch(err => {
            console.log(err);
        });
        mailList.forEach(async mailid => {
            var res = await GmaiilApi.untrashEmailAPi(authToken, mailid);
            if (res) {
                await TrashEmail.removeTrashFromLabel(mailid, false);
            }
        });
    }

}

exports.TrashEmail = TrashEmail;