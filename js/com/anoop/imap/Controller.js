fm.Package("com.anoop.imap");
fm.Import(".MyImap");
fm.Import(".Scraper");
fm.Import(".Label");
const mongouser = require('../../../../models/user');
const AppsflyerEvent = require("../../../../helper/appsflyerEvent").AppsflyerEvent;
fm.Class("Controller>com.anoop.email.BaseController", function (me, MyImap, Scraper, Label) {
    this.setMe = _me => me = _me;

    async function openFolder(token, folder, user, onDisconnect) {
        user = user || (await me.getUserById(token.user_id));
        if(!user){
            throw new Error("user left system "+ token+ user)
        }
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user, provider);
        console.log("got imap instace")
        if(onDisconnect) {
            myImap.keepCheckingConnection(function onFail(){
                onDisconnect();
                throw new Error("imap disconnected!");
            }, 90*1000);
        }
        await myImap.connect(provider).catch(async err => {
            if (err.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("leaving user as not loggedin reason:", err.message, user.email)
                await me.updateInactiveUser(user._id, err.message);
            }
            throw new Error(err);
        });
        console.log("imap connected");
        
        await myImap.openFolder(folder);
        console.log("imap folder opened");
        return myImap;
    };
    
    Static.updateMyDetail = updateMyDetail; 
    async function updateMyDetail(user_id, from_email, status) {
        await me.updateEmailDetailByFromEmail(user_id, from_email, status);
    };

    async function closeImap(myImap) {
        await myImap.closeFolder();
        myImap.end(myImap.imap);
    };

    ///------------------------------------- userAction ---------------------///

    // Static.updateUserByActionKey = async function(user_id,value){
    //     await me.updateUserByActionKey(user_id,value);
    // }

    ///------------------------------------- from unused ---------------------///

    Static.unusedToKeep = async function (token, from_email) {
        me.updateUserByActionKey(token.user_id, { "last_keep_date": new Date() });
    };

    Static.unusedToTrash = async function (token, from_email, onDisconnect) {
        console.log("openfolder")
        let myImap = await openFolder(token, "INBOX", undefined, onDisconnect);
        console.log("trash")
        await Label.moveInboxToTrash(myImap, from_email);
        console.log("close imap")
        me.updateUserByActionKey(token.user_id, { "last_trash_date": new Date() });
        await closeImap(myImap);
    };

    Static.unusedToUnsub = async function (token, from_email, onDisconnect) {
        console.log("openfolder")
        let myImap = await openFolder(token, "INBOX", undefined, onDisconnect);
        console.log("move")
        await Label.moveInboxToUnsub(myImap, from_email);
        console.log("close imap")
        me.updateUserByActionKey(token.user_id, { "last_unsub_date": new Date() });
        await closeImap(myImap);
    };

    Static.manualUnusedToTrash = async function (token, from_email, onDisconnect) {
        let myImap = await openFolder(token, "INBOX", undefined, onDisconnect);
        await Label.moveInboxToTrash(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: token.user_id,
            from_email,
            status: "trash"
        };
        await me.saveManualEmailData(token.user_id, data);
        me.updateUserByActionKey(token.user_id, { "last_manual_trash_date": new Date() });
        myImap.end(myImap.imap);
    };

    Static.manualUnusedToUnsub = async function (token, from_email, onDisconnect) {
        let myImap = await openFolder(token, "INBOX", undefined, onDisconnect);
        await Label.moveInboxToUnsub(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: token.user_id,
            from_email,
            status: "move"
        };
        await me.saveManualEmailData(token.user_id, data);
        me.updateUserByActionKey(token.user_id, { "last_manual_unsub_date": new Date() });
        myImap.end(myImap.imap);
    };

    ///------------------------------------- from keep ---------------------///

    Static.keepToTrash = async function (token, from_email, onDisconnect) {
        let myImap = await openFolder(token, "INBOX", undefined, onDisconnect);
        await Label.moveActiveToTrash(myImap, from_email);
        me.updateUserByActionKey(token.user_id, { "last_trash_date": new Date() });
        await closeImap(myImap);
    };

    Static.keepToUnsub = async function (token, from_email, onDisconnect) {
        let myImap = await openFolder(token, "INBOX", undefined, onDisconnect);
        await Label.moveActiveToUnsub(myImap, from_email);
        me.updateUserByActionKey(token.user_id, { "last_unsub_date": new Date() });
        await closeImap(myImap);

    }
    ///---------------------------------------from unsub folder--------------------///

    Static.unsubToKeep = async function (token, from_email, onDisconnect) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, user.unsub_label, user, onDisconnect);
        await Label.moveUnsubToInbox(myImap, from_email);
        me.updateUserByActionKey(token.user_id, { "last_keep_date": new Date() });
        await closeImap(myImap);
    };

    Static.unsubToTrash = async function (token, from_email, onDisconnect) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, user.unsub_label, user, onDisconnect);
        await Label.moveUnsubToTrash(myImap, from_email);
        me.updateUserByActionKey(token.user_id, { "last_trash_date": new Date() });
        await closeImap(myImap);
    };
    ///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function (token, from_email, onDisconnect) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, user.trash_label, user, onDisconnect);
        await Label.moveTrashToInbox(myImap, from_email);
        me.updateUserByActionKey(token.user_id, { "last_keep_date": new Date() });
        await closeImap(myImap);
    };

    Static.trashToUnsub = async function (token, from_email) {
        //// not in use
    };

    ////---------------------scrap fresh ==================

    Static.extractEmail = async function (user_id, reset_cb) {
        let myImap;
        let timeoutconst = setInterval(x => {
            if (!myImap) {
                let event = "user_" + Math.random().toString(36).slice(2);
                AppsflyerEvent.sendEventToAppsflyer(event, "process_failed_no_user", { "user": event })
                throw new Error("imap not available" + user_id);
            }
            if (myImap.imap.state === 'disconnected') {
                reset_cb();
                throw new Error("disconnected" + user_id);
            }
        }, 2 * 60 * 1000)
        await me.scanStarted(user_id);
        myImap = await openFolder({ user_id }, "INBOX");
        AppsflyerEvent.sendEventToAppsflyer(myImap.user.email, "process_started", { "user": myImap.user.email, "last_mid": myImap.box.uidnext })
        await mongouser.findOneAndUpdate({ _id: user_id }, { last_msgId: myImap.box.uidnext }, { upsert: true }).exec();
        let scraper = Scraper.new(myImap);
        await scraper.start(async function afterEnd() {
            console.log("is_finished called");
            await me.scanFinished(user_id);
            me.updateUserByActionKey(user_id, { "last_scan_date": new Date() });
            await me.handleRedis(user_id);
            AppsflyerEvent.sendEventToAppsflyer(myImap.user.email, "process_finished", { "user": myImap.user.email, "last_mid": myImap.box.uidnext })
        });
        clearInterval(timeoutconst);
        myImap.end(myImap.imap);
    }

    Static.extractEmailForCronJob = async function (user) {
        let myImap = await openFolder("", "INBOX", user);
        let scraper = Scraper.new(myImap);
        await scraper.update();
        myImap.end(myImap.imap);
        await me.updateLastMsgId(user._id, myImap.box.uidnext)
    }


    Static.extractOnLaunchEmail = async function (token) {
        return;
        await me.scanStarted(token.user_id);
        let myImap = await openFolder(token, "INBOX");
        await mongouser.findOneAndUpdate({ _id: token.user_id }, { last_msgId: myImap.box.uidnext }, { upsert: true })
        let scraper = Scraper.new(myImap);
        await scraper.onLauchScrap(async function afterEnd() {
            console.log("is_finished called")
            await me.scanFinished(token.user_id);
            me.updateUserByActionKey(token.user_id, { "last_scan_date": new Date() });
            await me.handleRedis(token.user_id);
        });
        myImap.end(myImap.imap);
    }

    Static.validCredentialCheck = async function (token) {
        let myImap = await openFolder(token, "INBOX");
        if (myImap) {
            myImap.end(myImap.imap);
            return true
        } else {
            myImap.end(myImap.imap);
            return false
        }
    }

    //////////////////// delete msg for user ///////////////////
    Static.deletePreviousMsg = async function (user) {
        if (user.unsub_label.toLowerCase().indexOf("inbox") == -1) {
            let myImap = await openFolder("", user.unsub_label, user);
            let scraper = Scraper.new(myImap);
            await scraper.deletePreviousMessages();
            await closeImap(myImap);
        }

        if (user.trash_label.toLowerCase().indexOf("inbox") == -1) {
            myImap = await openFolder("", user.trash_label, user);
            scraper = Scraper.new(myImap);
            await scraper.deletePreviousMessages();
            await closeImap(myImap);
        }
    }

    //////////////////// listen for user //////////////////////
    Static.listenForUser = async function (user, text, new_email_cb) {
        text && console.log(text, user.email);
        let myImap = await openFolder("", "INBOX", user);
        myImap.listen(async function (x, y) {
            new_email_cb(x, y);
            //   updateForUser(scraper, myImap, user);
        });
        myImap.onEnd(x => {
            console.log("ended", myImap.user.email);
            process.nextTick(r => me.listenForUser(user, "restarting for user", new_email_cb));
        });
        myImap.keepCheckingConnection(x => {
            process.nextTick(r => me.listenForUser(user, "restarting for user12", new_email_cb));
        });
        new_email_cb();
        // await updateForUser(scraper, myImap, user);
    }

    Static.updateForUser = async function (user_id, reset_cb) {
        let myImap;
        let timeoutconst = setInterval(x => {
            if (!myImap) {
                throw new Error("imap not available" + user_id);
            }
            if (myImap.imap.state === 'disconnected') {
                reset_cb();
                throw new Error("disconnected" + user_id);
            }
        }, 2 * 60 * 1000)
        let user = await me.getUserById(user_id).catch(error => {
            clearInterval(timeoutconst);
            throw new Error(error);
        });
        myImap = await openFolder("", "INBOX", user);
        let scraper = Scraper.new(myImap);
        if (myImap.user.last_msgId == undefined || myImap.user.last_msgId == "undefined") {
            myImap.user.last_msgId = myImap.box.uidnext;
            await me.updateLastMsgId(user._id, myImap.box.uidnext);
        }
        let is_more_than_limit = false
        await scraper.update(async function latest_id(id, temp) {
            id && (myImap.box.uidnext = id);
            temp && (is_more_than_limit = true);
        });
        clearInterval(timeoutconst);
        myImap.user.last_msgId = myImap.box.uidnext;
        myImap.end(myImap.imap);
        await me.updateLastMsgId(user._id, myImap.box.uidnext);
        is_more_than_limit && reset_cb();
    }

    Static.updateTrashLabel = async function (myImap) {
        let names = await myImap.getLabels();
        let label = names.filter(s => s.toLowerCase().includes('trash'))[0] || names.filter(s => s.toLowerCase().includes('junk'))[0] || names.filter(s => s.toLowerCase().includes('bin'))[0];
        console.warn("creating new label", label, myImap.user.email);
        if (label == undefined) {
            console.warn("moving to unsub_label");
            label = myImap.user.unsub_label;
        }
        myImap.user.trash_label = label;
        me.updateTrashLabelUser(myImap.user.email, label);
    }

    ///////////------------------------ login ------------------------///
    Static.login = async function (email, password, provider) {
        let PASSWORD = MyImap.encryptPassword(password);
        let myImap = await MyImap.new({
            email,
            password: PASSWORD
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
            user = await me.createUser(email, PASSWORD, trash_label);
        }
        if (provider.provider.includes("inbox.lv")) {
            await me.updateUser(email, "INBOX/Unsubscribed Emails", trash_label, PASSWORD);
        } else {
            await me.updateUser(email, "Unsubscribed Emails", trash_label, PASSWORD);
        }
        myImap.end(myImap.imap);
        let token = await me.createToken(user);
        // delay as active status require to setup listner so that it do not set multi listener for same user
        setTimeout(async x => {
            await me.reactivateUser(user._id);
            await me.notifyListner(user._id.toHexString());
        }, 1000);
        return token;
    }

    // Static.extractAllEmail = async function (token, folderName) {
    //     await me.scanStarted(token.user_id);
    //     let myImap = await openFolder(token, folderName);
    //     let names = await myImap.getLabels();
    //     console.log(names,myImap.box);
    //     let scraper = Scraper.new(myImap);
    //     let emails = await scraper.scrapAll(myImap.box.uidnext);
    //     await me.updateLastTrackMessageId(token.user_id, myImap.box.uidnext)
    //     myImap.imap.end(myImap.imap);
    //     return emails;
    // }

    Static.extractAllEmail = async function (token, folderName) {
        let lastmsg_id;
        await me.scanStarted(token.user_id);
        let myImap = await openFolder(token, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.scrapAll(myImap.box.uidnext);
        let names = await myImap.getLabels();
        lastmsg_id = myImap.box.uidnext;
        myImap.imap.end(myImap.imap);
        await names.asyncForEach(async element => {
            if (element != "INBOX" && (element.indexOf('[') == -1 || element.indexOf('[') == -1)) {
                let myImap = await openFolder(token, element);
                console.log("box name => ",myImap.box.name);
                if (myImap.box.uidnext > lastmsg_id) {
                    lastmsg_id = myImap.box.uidnext;
                }
                let scraper = Scraper.new(myImap);
                let emails = await scraper.scrapAll(myImap.box.uidnext);
                myImap.imap.end(myImap.imap);
            }
        });
        await me.updateLastTrackMessageId(token.user_id, lastmsg_id)
        return emails;
    }

    Static.extractEmailBySize = async function (token, folderName, smallerThan, largerThan) {
        await me.scanStarted(token.user_id);
        let myImap = await openFolder(token, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.size(smallerThan, largerThan);
        myImap.imap.end(myImap.imap);
        return emails;
    }

    Static.extractEmailByDate = async function (token, folderName, data) {
        await me.scanStarted(token.user_id);
        let myImap = await openFolder(token, folderName);
        // await mongouser.findOneAndUpdate({ _id: token.user_id }, { last_msgId: myImap.box.uidnext }, { upsert: true })
        let scraper = Scraper.new(myImap);
        let emails = await scraper.byDate(data);
        myImap.imap.end(myImap.imap);
        return emails;
    }

    // this will return all the emails
    Static.extractAllEmails = async function (token, folderName) {
        await me.scanStarted(token.user_id);
        let myImap = await openFolder(token, folderName);
        // await mongouser.findOneAndUpdate({ _id: token.user_id }, { last_msgId: myImap.box.uidnext }, { upsert: true })
        let scraper = Scraper.new(myImap);
        let emails = await scraper.getAllEmails();
        myImap.imap.end(myImap.imap);
        return emails;
    }

    Static.deleteQuickMail = async function (token, ids) {
        let user = await me.getUserById(token.user_id);
        console.log(user.email);
        console.log(ids);
        let myImap = await openFolder(token, "INBOX", user);
        await Label.setDeleteFlag(myImap, ids);
        await me.updateForDelete(token.user_id, ids);
        await closeImap(myImap);
    }

    Static.deleteQuickMailNew = async function (token, ids, box_name) {
        let user = await me.getUserById(token.user_id);
        let myImap = await openFolder(token, box_name, user);
        await Label.setDeleteFlag(myImap, ids);
        await me.updateForDelete(token.user_id, ids);
        await closeImap(myImap);
    }

});