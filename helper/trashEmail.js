
let email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
var { google } = require('googleapis');
class TrashEmail {

    static async getGmailInstance(auth) {
        let authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            auth: oauth2Client
        });
    }

    static async addTrashFromLabel(emailInfo, trash_value = true) {
        emailInfo.forEach(async email_id => {
            var oldvalue = {
                email_id: email_id
            };
            var newvalues = {
                $set: {
                    "is_trash": trash_value
                }
            };
            let response = await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });    
        });
    }

    static async removeTrashFromLabel(emailInfo, trash_value = true) {
            var oldvalue = {
                email_id: emailInfo.email_id
            };
            var newvalues = {
                $set: {
                    "is_trash": trash_value
                }
            };
            let response = await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
    }

    static async inboxToTrash(authToken, bodyData) {
        let mailList = await email.find({
            from_email: bodyData.from_email
        }).catch(err => {
            console.log(err);
        });
        const gmail = await TrashEmail.getGmailInstance(authToken);
        let mailIdList = mailList.map(x=>x.email_id);
            if(mailIdList){
                await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': mailIdList,
                        'addLabelIds': ["TRASH"]
                    }
                }).catch(err => {
                    console.log(err);
                });
                await TrashEmail.addTrashFromLabel(mailIdList);
            }
    }

    static async revertMailFromTrash(authToken, bodyData) {
        const gmail = await TrashEmail.getGmailInstance(authToken);
        let mailList = await email.find({
            from_email: bodyData.from_email,
            user_id: authToken.user_id,
            is_trash: true,
            is_delete: false
        }).catch(err => {
            console.log(err);
        });
        mailList.forEach(async mailid => {
            var res = await gmail.users.messages.untrash({
                userId: 'me',
                'id': mailid.email_id
            }).catch(err => {
                console.log(err);
            });
            await TrashEmail.removeTrashFromLabel(mailid, false);
        });
    }

}

exports.TrashEmail = TrashEmail;