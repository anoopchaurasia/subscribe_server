export default class TrashEmail {

    static async getGmailInstance(auth) {
        let authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            oauth2Client
        });
    }

    static async addTrashFromLabel(email, trash_value= true) {
        var oldvalue = {
            user_id: user_id,
            "from_email": email.from_email
        };
        var newvalues = {
            $set: {
                "is_trash": trash_value
            }
        };
        await email.updateOne({_id: email._id}, newvalues, { upsert: true }).catch(err => {
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
            TrashEmail.addTrashFromLabel(email);
        })
    }

    static async revertMailFromTrash(authToken, from_email) {
        const gmail = TrashEmail.getGmailInstance(authToken);
        let mailList = await email.find({
            from_email: from_email,
            user_id: authToken.user_id,
            is_trash: true,
            is_delete: false
        }).catch(err => {
            console.log(err);
        });
           
        mailList.forEach(async mailid => {
            var res = await gmail.users.messages.untrash({
                userId: 'me',
                'id': mailid
            }).catch(err => {
                console.log(err);
            });
            TrashEmail.addTrashFromLabel(email, false);
        });
    }

}
