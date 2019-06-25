fm.Package("com.anoop.gmail");
const Batchelor = require('batchelor');
fm.Class("Message", function(me){
    this.setMe=_me=>me=_me;
    
    Static.batchModify = async function(gmail, resource){
        return await gmail.userInstance().users.messages.batchModify({
            userId: 'me',
            resource: resource
        });
    };

    Static.getAllEmailList = async function (gmail, nextPageToken, formatted_date){
        return await runQuery(gmail, {
            userId: 'me',
            maxResults: 100, 
            'pageToken': nextPageToken, 
            q: `from:* AND after:${formatted_date}` 
        })
    };


    async function runQuery(gmail, query) {
        query.userId = query.userId || "me";
        query.maxResults = query.maxResults || 100;
        await gmail.userInstance().users.messages.list(query);
        let {messages, error, nextPageToken} = result;
        return {messages, error, nextPageToken};
    };

    Static.getEmailsBySender = async function(gmail, sender, formatted_date){
        return await runQuery(gmail, {
            userId: 'me',
            maxResults: 100, 
            'pageToken': nextPageToken, 
            q: `from:(${sender}) after:${formatted_date}`
        })
    };



    Static.getBatchMessage = async function(gmail, message_ids) {
        let batch = getBatch(await gmail.getAccessToken());
        message_ids.forEach(function (message) {
            batch.add({
                'method': 'GET',
                'path': '/gmail/v1/users/me/messages/' + message.id
            })
        });
        return new Promise((resolve, reject) => {
            batch.run(function (error, response) {
                if (!error) {
                    resolve(response.parts.map(function (a) { return a.body }));
                } else {
                    reject(error);
                }
            });
        });
    };

    function getBatch(access_token) {
        return new Batchelor({
            'uri': 'https://www.googleapis.com/batch',
            'method': 'POST',
            'auth': {
                'bearer': [access_token]
            },
            'headers': {
                'Content-Type': 'multipart/mixed'
            }
        });
    };
    
})