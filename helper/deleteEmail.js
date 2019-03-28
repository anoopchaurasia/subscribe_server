
'use strict'
const email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');



class DeleteEmail {

    static async deleteEmails(authToken, bodyData) {
        const emails = await email.find({ user_id: authToken.user_id, "from_email": bodyData.from_email })
        const gmail = await DeleteEmail.getGmailInstance(authToken);
        const emailIdList = emails.map(x => x.email_id);
        if (emailIdList) {
         const  response =  await gmail.users.messages.batchDelete({
                userId: 'me',
                resource: {
                    'ids': emailIdList
                }
            }).catch(err => {
                console.log(err);
            });
            if(response.status==200){
                await DeleteEmail.update_delete_status(emailIdList, authToken.user_id)
            }
        }
    }

    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
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
            await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
        });
    }
}


exports.DeleteEmail = DeleteEmail;