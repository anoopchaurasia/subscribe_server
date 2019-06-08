fm.Package("com.anoop.gmail");
fm.Class("Watch>.Gmail", function(me){
    this.setMe=_me=>me=_me;

    Static.set = function(user_id) {
        const gmail = me.userInstance(user_id);
        const oauth2Client = me.getOauth2ClientInstance(user_id);
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
    };
    
})