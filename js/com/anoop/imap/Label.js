fm.Package("com.anoop.imap");
fm.Class("Label>.Message", function(me){
    this.setMe=_me=>me=_me;

    ///---------------from inbox ------------
    Static.moveInboxToTrash =async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder("Trash", ids);
    };

    Static.moveInboxToUnsub = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        try{
            return await me.changeFolder("Unsubscribe Emails", ids);
        } catch(e) {
            await me.create(myImap);
            return await me.changeFolder("Unsubscribe Emails", ids);
        }
    };

    ////----------------------------unsub

    Static.moveUnsubToInbox = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder("Inbox", ids);
    };

    Static.moveUnsubToTrash = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder("Trash", ids);
    };

    ////--------------------------trash

    Static.moveTrashToInbox = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder("Inbox", ids);
    };

    Static.moveTrashToUnsub = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        try{
            return await me.changeFolder("Unsubscribe Emails", ids);
        } catch(e) {
            await me.create(myImap);
            return await  me.changeFolder("Unsubscribe Emails", ids);
        }
    };

    Static.create = async function (myImap, name="Unsubscribed Emails"){
        myImap.imap.addBox(name, function (err, box) {
            (err ? reject(err) : resolve(box));
        })
    };
});