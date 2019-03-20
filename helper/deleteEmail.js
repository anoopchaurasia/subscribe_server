export default class DeleteEmail {
    static async checkTokenLifetime(deviceToken, {from_email, emailIDS}, is_revert_from_trash) {
       
        if (is_revert_from_trash) {
            let mail = await revertMailFromTrash(user_id, oauth2Client, from_email, emailIDS);
        } else {
            let mail = await deleteAllEmailsAndMoveToTrash(user_id, oauth2Client, from_email, emailIDS);
        }
    }
    static async deleteEmails(authToken, emailIDS) {
        let gmail = getGmailInstance(authToken);
        await delete_email(emailIDS, user_id, gmail);
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

    static async addTrashFromLabel(email) {
        var oldvalue = {
            user_id: user_id,
            "from_email": email.from_email
        };
        var newvalues = {
            $set: {
                "is_trash": true
            }
        };
        await email.updateMany(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.log(err);
        });
    }

    static async inboxToTrash(authToken, from_email) {
        let mailList = await email.find({
            from_email: from_email,
            user_id: authToken.user_id,
            is_trash: false,
            is_delete: false
        }).catch(err => {
            console.log(err);
        });
        const gmail = getGmailInstance(authToken);
        mailList.forEach(email=> {
            await gmail.users.messages.modify({
                userId: 'me',
                'id': email.email_id,
                resource: {
                    'addLabelIds': ["TRASH"]
                }
            }).catch(err => {
                console.log(err);
            });
            addTrashFromLabel(email);
        })
    }


    static async revertMailFromTrash(user_id, auth, from_email, emailIDS) {
        const gmail = google.gmail({
            version: 'v1',
            auth
        });
        console.log("Trash To INBOX")
        let mailList = await email.find({
            "from_email": from_email
        }).catch(err => {
            console.log(err);
        });
        if (mailList) {
            let mailIds = [];
            let newLable = [];
            let mailLBL = mailList[0].labelIds.split(",");
            mailLBL.forEach(lblmail => {
                if (lblmail != "TRASH") {
                    newLable.push(lblmail);
                }
            });
            mailList.forEach(email => {
                mailIds.push(email.email_id);
            });
            var oldvalue = {
                user_id: user_id,
                "from_email": from_email,
                "is_delete": false
            };
            var newvalues = {
                $set: {
                    "labelIds": newLable,
                    "is_trash": false
                }
            };
            var upsert = {
                upsert: true
            };
            let result = await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            });
            console.log(result)
            let allLabels = ["TRASH"];
            mailIds.forEach(async mailid => {
                var res = await gmail.users.messages.untrash({
                    userId: 'me',
                    'id': mailid
                }).catch(err => {
                    console.log(err);
                });
            });
        }
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

    static async delete_email(email_ids, user_id, gmail) {
        email_ids.forEach(async email_id => {
            await gmail.users.messages.delete({
                userId: 'me',
                'id': email_id
            }).catch(err => {
                console.log(err);
            });
            update_delete_status(email_id, user_id)
        });
    } 
}