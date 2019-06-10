fm.Package("com.anoop.gmail");
fm.Class("Label>.Message", function(me){
    this.setMe=_me=>me=_me;

    this.Label = function(){

    };

    Static.moveToTrash =async function(gmail, mailIdList){
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            'addLabelIds': ["TRASH"]
        });
    };


    Static.create = function (gmail, name="Unsubscribed Emails"){
        const res = await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": name
            }
        }).catch(err => {
            console.error(err.message,"81");
            return
        });
        return res;
    };
})