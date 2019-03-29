'use strict'
const email = require('../models/email');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
class TrashEmail {

    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
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
            await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
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
            await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
    }

    static async inboxToTrash(authToken, bodyData) {
        let mailList = await email.find({
            from_email: bodyData.from_email,
            user_id:authToken.user_id
        }).catch(err => {
            console.log(err);
        });
        const gmail = google.gmail({ version: 'v1', auth:authToken });
        let mailIdList = mailList.map(x=>x.email_id);
            if(mailIdList){
               let modifying =  await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': mailIdList,
                        'addLabelIds': ["TRASH"]
                    }
                }).catch(err => {
                    console.log(err);
                });
                if( modifying&&modifying.status==200){
                    await TrashEmail.addTrashFromLabel(mailIdList);
                }
                // await gmail.users.messages.batchModify({
                //     userId: 'me',
                //     resource: {
                //         'ids': mailIdList,
                //         "removeLabelIds": ['INBOX']
                //     }
                // }).catch(err => {
                //     console.log(err);
                // });
                // await gmail.users.messages.batchModify({
                //     userId: 'me',
                //     resource: {
                //         'ids': mailIdList,
                //         'removeLabelIds': ["CATEGORY_PERSONAL"]
                //     }
                // }).catch(err => {
                //     console.log(err);
                // });
                // await gmail.users.messages.batchModify({
                //     userId: 'me',
                //     resource: {
                //         'ids': mailIdList,
                //         'removeLabelIds': ["CATEGORY_PROMOTIONS"]
                //     }
                // }).catch(err => {
                //     console.log(err);
                // });
            }
    }

    static async inboxToTrashFromExpenseBit(authToken,emailInfo) {
        const gmail = google.gmail({ version: 'v1', auth: authToken }); 
        if (emailInfo.email_id) {
            let modifying = await gmail.users.messages.modify({
                userId: 'me',
                'id': emailInfo.email_id,
                resource: {
                    'addLabelIds': ["TRASH"]
                }
            }).catch(err => {
                console.log(err);
            });
            if (modifying && modifying.status == 200) {
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
            if(res.status==200){
                await TrashEmail.removeTrashFromLabel(mailid, false);
            }
        });
    }

}

exports.TrashEmail = TrashEmail;