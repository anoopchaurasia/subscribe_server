fm.Package("com.anoop.gmail");
fm.Class("Message", function(me){
    this.setMe=_me=>me=_me;
    
    Static.batchModify = async function(gmail, resource){
        return await gmail.userInstance().users.messages.batchModify({
            userId: 'me',
            resource: resource
        });
    };

    Static.getEmailList = async function (gmail, nextPageToken, formatted_date){
        let result = await gmail.userInstance().users.messages.list({ 
            userId: 'me',
            maxResults: 100, 
            'pageToken': nextPageToken, 
            q: `from:* AND after:${formatted_date}` 
        });
        let {messages, error, nextPageToken} = result;
        return {messages, error, nextPageToken};
    }
})