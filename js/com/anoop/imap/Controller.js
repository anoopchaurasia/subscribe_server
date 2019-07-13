fm.Package("com.anoop.imap");
fm.Import(".MyImap");
fm.Import(".Scraper");
fm.Import(".Label");
const mongouser = require('../../../../models/user');
fm.Class("Controller>com.anoop.email.BaseController", function (me, MyImap, Scraper, Label) {
    this.setMe = _me => me = _me;

    ///------------------------------------- from unused ---------------------///

    Static.unusedToKeep = async function (token, from_email) {
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "keep");
    };


    Static.login = async function(email, password, provider){
        let PASSWORD = MyImap.encryptPassword(password);
        let myImap = await MyImap.new({
            email,
            password:PASSWORD
        }, provider.provider);
         await myImap.connect(provider);
        let names = await myImap.getLabels();
        if (!names.includes("Unsubscribed Emails")) {
           await Label.create(myImap, provider.provider);
        }
        let labels = names.filter(s => s.toLowerCase().includes('trash'))[0] || names.filter(s => s.toLowerCase().includes('junk'))[0] || names.filter(s => s.toLowerCase().includes('bin'))[0];
        let trash_label = labels;
        let user = await me.getUserByEmail(email);
        if (!user) {
            user = await me.createUser(email,PASSWORD,trash_label);
        }
        if (provider.provider.includes("inbox.lv")) {
            await me.updateUser(email, "INBOX/Unsubscribed Emails",trash_label,PASSWORD);
         } else {
            await me.updateUser(email, "Unsubscribed Emails", trash_label, PASSWORD);
        }
        myImap.imap.end(myImap.imap);
        return await me.createToken(user);
    }


    Static.unusedToTrash = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder("INBOX");
        await Label.moveInboxToTrash(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "trash");
        myImap.imap.end(myImap.imap);
    };

    Static.unusedToUnsub = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap =await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        let f = await myImap.openFolder("INBOX");
        await Label.moveInboxToUnsub(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "move");
        myImap.imap.end(myImap.imap);
    };

    Static.manualUnusedToTrash = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder("INBOX");
        await Label.moveInboxToTrash(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: user._id,
            from_email,
            status: "trash"
        };
        await me.saveManualEmailData(token.user_id, data);
        myImap.imap.end(myImap.imap);
    };

    Static.manualUnusedToUnsub = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder("INBOX");
        await Label.moveInboxToUnsub(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: user._id,
            from_email,
            status: "move"
        };
        await me.saveManualEmailData(token.user_id, data);
        myImap.imap.end(myImap.imap);
    };

    Static.automaticInboxToUnsub = async function (user_id, email_id) {
        let user = await me.getUserById(user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder("INBOX");
        let email_id_arr = [email_id];
        await Label.moveInboxToUnsub(myImap, email_id_arr);
        await myImap.closeFolder();
        myImap.imap.end(myImap.imap);
    };


    Static.automaticInboxToTrash = async function (user_id, email_id) {
        let user = await me.getUserById(user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder("INBOX");
        let email_id_arr = [email_id];
        await Label.moveInboxToTrash(myImap, email_id_arr);
        await myImap.closeFolder();
        myImap.imap.end(myImap.imap);
    };


    ///------------------------------------- from keep ---------------------///

    Static.keepToTrash = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder("INBOX");
        await Label.moveActiveToTrash(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "trash");
        myImap.imap.end(myImap.imap);
    };

    Static.keepToUnsub = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        let f = await myImap.openFolder("INBOX");
        await Label.moveActiveToUnsub(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "move");
        myImap.imap.end(myImap.imap);
    };

    ///---------------------------------------from unsub folder--------------------///
 
    Static.unsubToKeep = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap =await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder(myImap.user.unsub_label);
        await Label.moveUnsubToInbox(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "keep");
        myImap.imap.end(myImap.imap);
    };

    Static.unsubToTrash = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap =await MyImap.new(user);
        
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        await myImap.openFolder(myImap.user.unsub_label);
        await Label.moveUnsubToTrash(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "trash");
        myImap.imap.end(myImap.imap);
    };
    ///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap =await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        let f = await myImap.openFolder(myImap.user.trash_label);
        await Label.moveTrashToInbox(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "keep");
        myImap.imap.end(myImap.imap);
    };

    Static.trashToUnsub = async function (token, from_email) {
        let emaildetail = await me.getEmailDetail(token, from_email);
        let gmailInstance = await MyImap.getInstanceForUser(token.user_id);
        await Label.moveTrashToInbox(gmailInstance, emailids);
        await me.updateEmailDetailStatus(emaildetail._id, "unsub");
    };

    //-----------------------------by sender id--------------------------------------//


    Static.inboxToUnsubBySender = async function (token, sender_email) {
        let { emaildetail, ids } = await commonBySender(token, sender_email, "move");
        await Label.bulkUNusedToUnsub(emaildetail)
    };

    async function commonBySender(token, sender_email, status) {
        let gmailInstance = await MyImap.getInstanceForUser(token.user_id);
        let scraper = Scraper.new(gmailInstance);
        let ids = await scraper.getEmaiIdsBySender(sender_email);
        if (ids.length == 0) {
            throw new Error("no email fond for sender", sender_email, user_id);
        }
        let emaildetail = me.updateOrCreateAndGetEMailDetailFromData({ from_email: sender_email, from_email_name: sender_email, to_email: null }, token.user_id);
        let emailinfos = ids.map(x => {
            return Emailinfo.fromEamil({ email_id: x, labelIds: [] }, emaildetail._id);
        });
        await me.insertBulkEmailDetail(emailinfos);
        return { emaildetail, ids: emailinfos.map(x => x.email_id) };
    }

    Static.inboxToTrashBySender = async function (token, sender_email) {
        let emailinfos = await commonBySender(token, sender_email, "trash");
        await Emailinfo.bulkInsert(emailinfos);
    }


    ////---------------------scrap fresh ==================

    Static.extractEmail = async function (token) {
        let user = await me.getUserById(token.user_id);
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        let box = await myImap.openFolder("INBOX");
        await mongouser.findOneAndUpdate({ _id: token.user_id }, { last_msgId: box.uidnext }, { upsert: true })
        let scraper = Scraper.new(myImap);
        await scraper.start();
        myImap.imap.end(myImap.imap);
    }

    Static.extractEmailForCronJob = async function (user) {
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user);
        await myImap.connect(provider).catch(err => {
            console.error(err.message, err.stack, "imap connect here");
        });
        let box = await myImap.openFolder("INBOX");
        await me.updateLastMsgId(user._id, box.uidnext)
        let scraper = Scraper.new(myImap);
        await scraper.update();
        myImap.imap.end(myImap.imap);
    }

});