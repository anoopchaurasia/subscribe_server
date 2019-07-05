fm.Package("com.anoop.imap");
fm.Class("Label>.Message", function (me) {
    this.setMe = _me => me = _me;

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
                return await me.changeFolder(myImap.imap, "Unsubscribed Emails", ids);
            } catch (e) {
                await me.create(myImap);
                return await me.changeFolder(myImap.imap, "Unsubscribed Emails", ids);
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
                return await me.changeFolder("Unsubscribed Emails", ids);
            } catch (e) {
                await me.create(myImap);
                return await me.changeFolder("Unsubscribed Emails", ids);
            }
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
                return await me.changeFolder(myImap.imap, "Unsubscribed Emails", ids);
            } catch (e) {
                await me.create(myImap);
                return await me.changeFolder(myImap.imap, "Unsubscribed Emails", ids);
            }
        }
        return
    };

    Static.create = async function (myImap, name = "Unsubscribed Emails") {
        myImap.imap.addBox(name, function (err, box) {
            (err ? reject(err) : resolve(box));
        })
    };
});