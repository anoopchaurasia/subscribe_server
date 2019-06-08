
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
            console.error(err.message,"75");
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
            console.error(err.message,"76");
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
            console.error(err.message,"77");
            return
        });
        return response;
    }

    /*
        This function for Moving Mail form INbox To trash Folder.
        this will adc trash label in single mail requiest using email id.
    */
    static async trashEmailAPiMulti(authToken, email_ids) {
        const gmail = google.gmail({ version: 'v1', auth:authToken })
        // const gmail = await GmailApis.getGmailInstance(authToken);
        let response = await  gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                ids: email_ids,
                'addLabelIds': ["TRASH"]
            }
        }).catch(err => {
            console.error(err.message,"77");
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
            console.error(err.message,"78");
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
            console.error(err.message,"79");
        });
        return response;
    }


    /*
        This function for getting Gmail Instance for another api/function.
        Using Accesstoken Infor and Credential Gmail Instance will be created.
    */
    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e,"80"));
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
            console.error(err.message,"81");
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
    
        let response = await gmail.users.watch(options).catch(e=> console.error(e.message,"82"));
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
            console.error(err.message,"83");
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
            console.error(err.message,"84");
            return
        });
        if(modify){
            return modify.status
        }
    }


    /*
        This function will modify Add and remove labels Mail in Batch with given Parameters
    */
    static async batchModifyAddAndRemoveLabels(auth, mailIds, addLabels, removeLabels) {
    
        if(mailIds.length<=0) return;
        var msgIDS = mailIds.splice(0,998);
        let gmail = google.gmail({ version: 'v1', auth });
        var resp = await gmail.users.messages.batchModify({
            userId: 'me',
            resource: {
                'ids': msgIDS,
                'addLabelIds': addLabels,
                "removeLabelIds": removeLabels
            }
        }).catch (err => {
            console.error(err.message,"85");
            return 
        });
        return GmailApis.batchModifyAddAndRemoveLabels(auth,mailIds,addLabels,removeLabels);
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
            console.error(err.message,"86");
        });;
        await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
        return res;
    }

    static async getLabelListGmailAPi(auth){
        const gmail = google.gmail({ version: 'v1', auth });
        const res = await gmail.users.labels.list({
            userId: 'me',
        }).catch(err => {
            console.error(err.message,"87");
        });
        return res;
    }

}


exports.GmailApis = GmailApis;