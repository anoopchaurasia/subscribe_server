fm.Package("com.anoop.imap");
fm.Class("Label>.Message", function(me){
    this.setMe=_me=>me=_me;

    ///---------------from inbox ------------
    Static.moveInboxToTrash =async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder(myImap.imap,myImap.user.trash_label, ids);
    };

    Static.moveInboxToUnsub = async function(myImap, from_email){
        try{
            let ids = await me.getAllEmailIdList(myImap.imap, from_email);
            return await me.changeFolder(myImap.imap,"Unsubscribed Emails", ids);
        } catch(e) {
            await me.create(myImap);
            return await me.changeFolder(myImap.imap,"Unsubscribed Emails", ids);
        }
    };

    ////----------------------------unsub

    Static.moveUnsubToInbox = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        
        return await me.changeFolder(myImap.imap,"Inbox", ids);
    };

    Static.moveUnsubToTrash = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
    };

    ////--------------------------trash

    Static.moveTrashToInbox = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        console.log(ids)
        return await me.changeFolder(myImap.imap,"Inbox", ids);
    };

    Static.moveTrashToUnsub = async function(myImap, from_email){
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        try{
            return await me.changeFolder("Unsubscribed Emails", ids);
        } catch(e) {
            await me.create(myImap);
            return await  me.changeFolder("Unsubscribed Emails", ids);
        }
    };


    ////--------------------------Active

    Static.moveActiveToTrash= async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
    };

    Static.moveActiveToUnsub = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        try {
            return await me.changeFolder(myImap.imap,"Unsubscribed Emails", ids);
        } catch (e) {
            await me.create(myImap);
            return await me.changeFolder(myImap.imap,"Unsubscribed Emails", ids);
        }
    };

    Static.create = async function (myImap, name="Unsubscribed Emails"){
        myImap.imap.addBox(name, function (err, box) {
            (err ? reject(err) : resolve(box));
        })
    };
});