
'use strict'
const email = require('../models/emailDetails');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');


class GmailApis {


    /*
        This function will delete mail with batch request.
    */
    static async deleteEmailApi(authToken,emailIdList){
        const gmail = await GmailApis.getGmailInstance(authToken);
        const response = await gmail.users.messages.batchDelete({
            userId: 'me',
            resource: {
                'ids': emailIdList
            }
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        return response;
    }

    /*
        This function for Moving Mail form INbox To trash Folder.
        this will add trash label in batch request
    */
    static async trashEmailBatchAPi(authToken, mailIdList) {
        const gmail = await GmailApis.getGmailInstance(authToken);
        let response = await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': mailIdList,
                'addLabelIds': ["TRASH"]
            }
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        return response;
    }

    /*
        This function for Moving Mail form INbox To trash Folder.
        this will adc trash label in single mail requiest using email id.
    */
    static async trashEmailAPi(authToken, email_id) {
        const gmail = google.gmail({ version: 'v1', auth:authToken })
        // const gmail = await GmailApis.getGmailInstance(authToken);
        let response = await  gmail.users.messages.modify({
            userId: 'me',
            'id': email_id,
            resource: {
                'addLabelIds': ["TRASH"]
            }
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        return response;
    }

    static async trashBatchEmailAPi(authToken, mailIds) {
        const gmail = await GmailApis.getGmailInstance(authToken);
        // const gmail = google.gmail({ version: 'v1', auth: authToken })
        let modify = await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': mailIds,
                'addLabelIds': ["TRASH"]
            }
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        if(modify){
            return modify
        }
    }


    /*
        This function will untrash email using email Id.
    */
    static async untrashEmailAPi(authToken, email_id) {
        const gmail = await GmailApis.getGmailInstance(authToken);
        let response = await gmail.users.messages.untrash({
            userId: 'me',
            'id': email_id
        }).catch(err => {
            console.error(err.message, err.stack);
        });
        return response;
    }


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

    static async createLabelGmailApi(auth){
        const gmail = google.gmail({ version: 'v1', auth })
        const res = await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": "Unsubscribed Emails"
            }
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        return res;
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
        let response = await gmail.users.watch(options).catch(e=> console.error(e.message, e.stack));
        return
    }

    /*
        This function will modify Remove Labels Mail in Batch with given Parameters
    */
    static async batchModifyRemoveLabels(auth, mailIds, labels) {
        const gmail = google.gmail({ version: 'v1', auth });
        let modif = await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': mailIds,
                "removeLabelIds": labels
            }
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        return modif
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
        }).catch(err => {
            console.error(err.message, err.stack);
            return
        });
        if(modify){
            console.log(modify.status)
            return modify.status
        }
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
        }).catch (err => {
            console.error(err.message, err.stack);
            return 
        });
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
        }).catch(err => {
            console.error(err.message, err.stack);
        });;
        await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
        return res;
    }

    static async getLabelListGmailAPi(auth){
        const gmail = google.gmail({ version: 'v1', auth });
        const res = await gmail.users.labels.list({
            userId: 'me',
        }).catch(err => {
            console.error(err.message, err.stack);
        });
        return res;
    }

}


exports.GmailApis = GmailApis;