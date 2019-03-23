
let email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
var { google } = require('googleapis');



class DeleteEmail {

    static async deleteEmails(authToken, from_email) {
        console.log(from_email)
        let emails = await email.find({user_id:authToken.user_id,"fromw_email":from_email})
        let gmail = DeleteEmail.getGmailInstance(authToken);
        emails.forEach(async email_id => {
            await gmail.users.messages.delete({
                userId: 'me',
                'id': email_id
            }).catch(err => {
                console.log(err);
            });
            DeleteEmail.update_delete_status(email_id, authToken.user_id)
        });
    }

    static async getGmailInstance(auth) {
        let authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            oauth2Client
        });
    }

    static async update_delete_status(email_id, user_id){
        let oldvalue = {
            user_id: user_id,
            "email_id": email_id,
            "is_delete": false
        };
        let newvalues = {
            $set: {
                "is_delete": true
            }
        };
        await email.updateOne(oldvalue, newvalues, {upsert:true}).catch(err => {
            console.log(err);
        });
    }
}


exports.DeleteEmail = DeleteEmail;