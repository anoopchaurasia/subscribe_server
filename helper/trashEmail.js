'use strict'
const email = require('../models/emailDetails');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const emailInformation = require('../models/emailInfo');
const { google } = require('googleapis');
const GmaiilApi = require("../helper/gmailApis").GmailApis;
class TrashEmail {

    /*
    This function for getting Gmail Instance for another api/function.
    Using Accesstoken Infor and Credential Gmail Instance will be created.
    */
    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e.message));
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
    static async addTrashFromLabel(from_email,user_id, trash_value = "trash") {
            var oldvalue = {
                from_email: from_email,
                user_id:user_id
            };
            var newvalues = {
                $set: {
                    "status": trash_value,
                    "status_date": new Date()
                }
            };
            await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.error(err.message);
            });
    }

    /*
        This function for Updating Is_trash Label for database.
        thsi will update email object with is_trash=false for untrash email done by one.
    */
    static async removeTrashFromLabel(emailInfo, trash_value = "trash") {
        var oldvalue = {
            email_id: emailInfo.email_id
        };
        var newvalues = {
            $set: {
                "status": trash_value,
                "status_date": new Date()
            }
        };
        await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.error(err.message);
        });
    }


    /*
        This function for Moving Mail form INbox To trash Folder.
        Using From_email getting all Emails and Getting EmailID list from Emails.
        Using That EmailId List Changing Trash Lable for all mail in Batch.
    */
    static async inboxToTrash(authToken, bodyData) {
        let mail = await email.findOne({
            from_email: bodyData.from_email,
            user_id: authToken.user_id
        }).catch(err => {
            console.error(err.message);
        });
        let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message); });
        let mailIdList = mailList.map(x => x.email_id);
        if (mailIdList) {
            let modifying = await GmaiilApi.trashBatchEmailAPi(authToken, mailIdList);
            if (modifying) {
                await TrashEmail.addTrashFromLabel(bodyData.from_email,authToken.user_id);
            }
        }
    }


    /*
        This Function For Moving Mail from inbox to Trash folder.
        This will move one email at a time. and changed is_trash value into database same time.
    */
    static async inboxToTrashFromExpenseBit(authToken, emailInfo) {
        if (emailInfo.email_id) {
            await GmaiilApi.trashEmailAPi(authToken, emailInfo.email_id);
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
            status: "trash"
        }).catch(err => {
            console.error(err.message);
        });
        mailList.forEach(async mailid => {
            var res = await GmaiilApi.untrashEmailAPi(authToken, mailid);
            if (res) {
                await TrashEmail.removeTrashFromLabel(mailid, "unused");
            }
        });
    }

}

exports.TrashEmail = TrashEmail;