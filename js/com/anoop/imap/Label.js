fm.Package("com.anoop.imap");
fm.Class("Label>.Message", function (me) {
    this.setMe = _me => me = _me;

    Static.moveInboxToTrashAuto = async function (myImap, ids) {
        try {
            return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
        } catch (error) {
           await me.package.Controller.updateTrashLabel(myImap);
           try {
               return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
           } catch (error) {
               console.log(error)
           }
        }
    };

    Static.moveInboxToUnsubAuto = async function (myImap, ids) {
        try {
            // console.log(ids)
            return await me.changeFolder(myImap.imap, myImap.user.unsub_label, ids);
        } catch (e) {
            await me.create(myImap);
            return await me.changeFolder(myImap.imap, myImap.user.unsub_label, ids);
        }
    };

    ///---------------from inbox ------------
    Static.moveInboxToTrash = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
        }
        return
    };

    Static.checkIds = async function (ids) {
        return ids.length != 0 ? true : false;
    }   

    Static.moveInboxToUnsub = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            try {
                return await me.changeFolder(myImap.imap, myImap.user.unsub_label, ids);
            } catch (e) {
                await me.create(myImap);
                return await me.changeFolder(myImap.imap, myImap.user.unsub_label, ids);
            }
        }
        return
    };

    ////----------------------------unsub

    Static.moveUnsubToInbox = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            return await me.changeFolder(myImap.imap, "INBOX", ids);
        }
        return
    };

    Static.moveUnsubToTrash = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
        }
        return
    };

    ////--------------------------trash

    Static.moveTrashToInbox = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            return await me.changeFolder(myImap.imap, "INBOX", ids);
        }
        return
    };

    Static.moveTrashToUnsub = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            try {
                return await me.changeFolder(myImap.user.unsub_label, ids);
            } catch (e) {
                await me.create(myImap);
                return await me.changeFolder(myImap.user.unsub_label, ids);
            }
        }
        return
    };


     ////-------------------------Delete messages
     Static.setDeleteFlag = async function (myImap, ids) {
        if (ids.length!=0) {
               return await me.deleteMsg(myImap.imap, ids);
        }
        return        
    };


    ////--------------------------Active

    Static.moveActiveToTrash = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            return await me.changeFolder(myImap.imap, myImap.user.trash_label, ids);
        }
        return
    };

    Static.moveActiveToUnsub = async function (myImap, from_email) {
        let ids = await me.getAllEmailIdList(myImap.imap, from_email);
        if (ids.length!=0) {
            try {
                return await me.changeFolder(myImap.imap, myImap.user.unsub_label, ids);
            } catch (e) {
                await me.create(myImap);
                return await me.changeFolder(myImap.imap, myImap.user.unsub_label, ids);
            }
        }
        return
    };

    Static.create = async function (myImap, name = myImap.user.unsub_label) {
        await myImap.createlabel(name).catch(e=> console.error(e.message, "create label", name));
    };
});