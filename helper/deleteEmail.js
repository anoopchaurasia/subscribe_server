
'use strict'
const email = require('../models/emailDetails');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
const GmaiilApi = require("../helper/gmailApis").GmailApis;

class DeleteEmail {


    /*
        This function Will be called from delete Email api.
        Function will find emails list and getting emailIDlist. using that emailId list deleting all Email
        in Batch.
    */
    static async deleteEmails(authToken, bodyData) {
        const emails = await email.find({ user_id: authToken.user_id, "from_email": bodyData.from_email })
        const emailIdList = emails.map(x => x.email_id);
        console.log(emailIdList)
        if (emailIdList) {
            let response = await GmaiilApi.deleteEmailApi(authToken,emailIdList);
            if(response){
                await DeleteEmail.update_delete_status(bodyData.from_email, authToken.user_id)
            }
        }
    }


    /*
        This function for getting Gmail Instance for another api/function.
        Using Accesstoken Infor and Credential Gmail Instance will be created.
    */
    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e.message, e.stack));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            auth: oauth2Client
        });
    }

    /*
        This function for Updating Is_delete Label for database.
        this will update email object with is_delete=true for Deleted email data/list.
    */
    static async update_delete_status(from_email,user_id) {
          let oldvalue = {
                "from_email": from_email,
                "user_id":user_id
            };
            let newvalues = {
                $set: {
                    "status": "delete",
                    "status_date":new Date()
                }
            };
            await email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            });
    }
}


exports.DeleteEmail = DeleteEmail;