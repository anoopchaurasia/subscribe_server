fm.Package("com.anoop.gmail");
fm.Class("Label>.Gmail", function(me){
    this.setMe=_me=>me=_me;

    this.Label = function(){

    };

    Static.moveToTrash = function(user_id){
        const gmail = me.userInstance(user_id);
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
    };
})