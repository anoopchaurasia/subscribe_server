fm.Package("com.anoop.gmail");
fm.Class("Message", function(me){
    this.setMe=_me=>me=_me;
    
    Static.batchModify = async function(gmail, resource){
        return await gmail.users.messages.batchModify({
            userId: 'me',
            resource: resource
        });
    };
})