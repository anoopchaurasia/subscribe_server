export default class DeleteEmail {

    static async deleteEmails(authToken, emailIDS) {
        let gmail = DeleteEmail.getGmailInstance(authToken);
        emailIDS.forEach(async email_id => {
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