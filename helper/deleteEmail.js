
let email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
var { google } = require('googleapis');



class DeleteEmail {

    static async deleteEmails(authToken, bodyData) {
        let emails = await email.find({ user_id: authToken.user_id, "from_email": bodyData.from_email })
        let gmail = await DeleteEmail.getGmailInstance(authToken);
        let emailIdList = emails.map(x => x.email_id);
        if (emailIdList) {
            await gmail.users.messages.batchDelete({
                userId: 'me',
                resource: {
                    'ids': emailIdList
                }
            }).catch(err => {
                console.log(err);
            });
            await DeleteEmail.update_delete_status(emailIdList, authToken.user_id)
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

    static async update_delete_status(emailInfo, user_id) {
        emailInfo.forEach(async email_id => {
            let oldvalue = {
                "email_id": email_id
            };
            let newvalues = {
                $set: {
                    "is_delete": true
                }
            };
            let resp = await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
        });
    }
}


exports.DeleteEmail = DeleteEmail;