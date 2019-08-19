fm.Package("com.anoop.imap");
fm.Import(".MyImap");
fm.Import(".Scraper");
fm.Import(".Label");
const mongouser = require('../../../../models/user');
fm.Class("Controller>com.anoop.email.BaseController", function (me, MyImap, Scraper, Label) {
    this.setMe = _me => me = _me;

    async function openFolder(token, folder, user) {
        user =  user || (await me.getUserById(token.user_id));
        let domain = user.email.split("@")[1]; 
        let provider = await me.getProvider(domain) 
        let myImap = await MyImap.new(user, provider.provider);
        await myImap.connect(provider).catch(async err => {
            if (err.message.includes("Invalid credentials")) {
                await me.updateInactiveUser(user._id);
            } 
            throw new Error(err);
        });;
        await myImap.openFolder(folder);
        return myImap;
    };

    async function updateMyDetail(user_id, from_email, status) {
        await me.updateEmailDetailByFromEmail(user_id, from_email, status);
    };

    async function closeImap(myImap) {
        await myImap.closeFolder();
        myImap.imap.end(myImap.imap);
    };

    ///------------------------------------- from unused ---------------------///

    Static.unusedToKeep = async function (token, from_email) {
        await updateMyDetail(token.user_id, from_email, 'keep');
    };

    Static.unusedToTrash = async function (token, from_email) {
        let myImap = await openFolder(token, "INBOX");
        await Label.moveInboxToTrash(myImap, from_email);
        await closeImap(myImap);
        await updateMyDetail(token.user_id, from_email, 'trash')
    };

    Static.unusedToUnsub = async function (token, from_email) {
        let myImap = await openFolder(token, "INBOX");
        await Label.moveInboxToUnsub(myImap, from_email);
        await updateMyDetail(token.user_id, from_email, "move");
        await closeImap(myImap);
	};

    Static.manualUnusedToTrash = async function (token, from_email) {
        let myImap = await openFolder(token, "INBOX");
        await Label.moveInboxToTrash(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: token.user_id,
            from_email,
            status: "trash"
        };
        await me.saveManualEmailData(token.user_id, data);
        myImap.imap.end(myImap.imap);
    };

    Static.manualUnusedToUnsub = async function (token, from_email) {
        let myImap = await openFolder(token, "INBOX");
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
        let myImap = await openFolder({user_id}, "INBOX");
        let email_id_arr = [email_id];
        await Label.moveInboxToUnsub(myImap, email_id_arr);
        await closeImap(myImap);
    };


    Static.automaticInboxToTrash = async function (user_id, email_id) {
        let myImap = await openFolder({user_id}, "INBOX");
        let email_id_arr = [email_id];
        await Label.moveInboxToTrash(myImap, email_id_arr);
        await closeImap(myImap);
    };


    ///------------------------------------- from keep ---------------------///

    Static.keepToTrash = async function (token, from_email) {
        let myImap = await openFolder(token, "INBOX");
        await Label.moveActiveToTrash(myImap, from_email);
        await updateMyDetail(token.user_id, from_email, "trash");
        await closeImap(myImap);
    };

    Static.keepToUnsub = async function (token, from_email) {
        let myImap = await openFolder(token, "INBOX");
        await Label.moveActiveToUnsub(myImap, from_email);
        await updateMyDetail(token.user_id, from_email, "move");
        await closeImap(myImap);

    }
    ///---------------------------------------from unsub folder--------------------///
 
     Static.unsubToKeep = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, user.unsub_label,user);
        await Label.moveUnsubToInbox(myImap, from_email);
        await updateMyDetail(token.user_id, from_email, "keep");
        await closeImap(myImap);
    };
 	
	Static.unsubToTrash = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, user.unsub_label,user);
        await Label.moveUnsubToTrash(myImap, from_email);
        await updateMyDetail(token.user_id, from_email, "trash");
        await closeImap(myImap);
    };
    ///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, user.trash_label,user);
        await Label.moveTrashToInbox(myImap, from_email);
        await updateMyDetail(token.user_id, from_email, "keep");
        await closeImap(myImap);
    };

    Static.trashToUnsub = async function (token, from_email) {
        let emaildetail = await me.getEmailDetail(token, from_email);
        let gmailInstance = await MyImap.getInstanceForUser(token.user_id);
        await Label.moveTrashToInbox(gmailInstance, from_email);
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
        
        await me.scanStarted(token.user_id);
        let myImap = await openFolder(token, "INBOX");
        await mongouser.findOneAndUpdate({ _id: token.user_id }, { last_msgId: myImap.box.uidnext }, { upsert: true })
        let scraper = Scraper.new(myImap);
        await scraper.start(async function afterEnd(){
            console.log("is_finished called")
            await me.scanFinished(token.user_id);
            await me.handleRedis(token.user_id);
         });
        myImap.imap.end(myImap.imap);
    }

    Static.extractEmailForCronJob = async function (user) {
        let myImap = await openFolder("", "INBOX", user);
        let scraper = Scraper.new(myImap);
        await scraper.update();
        myImap.imap.end(myImap.imap);
        await me.updateLastMsgId(user._id, myImap.box.uidnext)
    }

    Static.listenForUser = async function (user, text) {
        text && console.log(text, user.email);
        let myImap = await openFolder("", "INBOX", user);
        let scraper = Scraper.new(myImap);
        myImap.listen(async function(x,y){
            updateForUser(scraper, myImap, user);
        });
        myImap.onEnd(x=>{
            console.log("ended", myImap.user.email);
            process.nextTick(r=> me.listenForUser(user, "restarting for user"));
        });
        await updateForUser(scraper, myImap, user);
    }

    async function updateForUser(scraper, myImap, user){
        await scraper.update(function latest_id(id){
            id && (myImap.box.uidnext = id);
        });
        myImap.user.last_msgId = myImap.box.uidnext;
        await me.updateLastMsgId(user._id, myImap.box.uidnext)
    }

    ///////////------------------------ login ------------------------///
    Static.login = async function(email, password, provider){
        let PASSWORD = MyImap.encryptPassword(password);
        let myImap = await MyImap.new({
            email,
            password:PASSWORD
        }, provider.provider);
         await myImap.connect(provider);
        let names = await myImap.getLabels();
        if (!names.includes("Unsubscribed Emails")) {
           await Label.create(myImap, "Unsubscribed Emails");
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

});