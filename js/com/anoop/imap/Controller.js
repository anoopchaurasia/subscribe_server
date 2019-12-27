fm.Package("com.anoop.imap");
fm.Import(".MyImap");
fm.Import(".Scraper");
fm.Import(".Label");
fm.Class("Controller>com.anoop.email.BaseController", function (me, MyImap, Scraper, Label) {
    this.setMe = _me => me = _me;

    async function openFolder(user, folder, onDisconnect) {
        console.time("openFolder")
        if(!user){
            throw new Error("user left system "+ user)
        }
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user, provider);
        console.timeLog("openFolder")
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
                await me.UserModel.updateInactiveUser(user, {inactive_reason: err.message, inactive_at: new Date}, {_id: user._id, inactive_at: null});
            }
            throw new Error(err);
        });
        console.timeLog("openFolder")
        console.log("imap connected");
        
        await myImap.openFolder(folder);
        console.log("imap folder opened");
        console.timeEnd("openFolder")
        return myImap;
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

    Static.unusedToKeep = async function (user, from_email) {
        me.updateUserByActionKey(user._id, { "last_keep_date": new Date() });
    };

    Static.unusedToTrash = async function (user, from_email, onDisconnect) {
        console.log("openfolder")
        let myImap = await openFolder(user, "INBOX", onDisconnect);
        console.log("trash")
        await Label.moveInboxToTrash(myImap, from_email);
        console.log("close imap")
        me.updateUserByActionKey(user._id, { "last_trash_date": new Date() });
        await closeImap(myImap);
    };

    Static.unusedToUnsub = async function (user, from_email, onDisconnect) {
        console.log("openfolder")
        let myImap = await openFolder(user, "INBOX", onDisconnect);
        console.log("move")
        await Label.moveInboxToUnsub(myImap, from_email);
        console.log("close imap")
        me.updateUserByActionKey(user._id, { "last_unsub_date": new Date() });
        await closeImap(myImap);
    };

    Static.manualUnusedToTrash = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, "INBOX", onDisconnect);
        await Label.moveInboxToTrash(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: user._id,
            from_email,
            status: "trash"
        };
        await me.saveManualEmailData(user._id, data);
        me.updateUserByActionKey(user._id, { "last_manual_trash_date": new Date() });
        myImap.end(myImap.imap);
    };

    Static.manualUnusedToUnsub = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, "INBOX", onDisconnect);
        await Label.moveInboxToUnsub(myImap, from_email);
        await myImap.closeFolder();
        let data = {
            user_id: user._id,
            from_email,
            status: "move"
        };
        await me.saveManualEmailData(user._id, data);
        me.updateUserByActionKey(user._id, { "last_manual_unsub_date": new Date() });
        myImap.end(myImap.imap);
    };

    ///------------------------------------- from keep ---------------------///

    Static.keepToTrash = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, "INBOX", onDisconnect);
        await Label.moveActiveToTrash(myImap, from_email);
        me.updateUserByActionKey(user._id, { "last_trash_date": new Date() });
        await closeImap(myImap);
    };

    Static.keepToUnsub = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, "INBOX", onDisconnect);
        await Label.moveActiveToUnsub(myImap, from_email);
        me.updateUserByActionKey(user._id, { "last_unsub_date": new Date() });
        await closeImap(myImap);

    }
    ///---------------------------------------from unsub folder--------------------///

    Static.unsubToKeep = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, user.unsub_label, onDisconnect);
        await Label.moveUnsubToInbox(myImap, from_email);
        me.updateUserByActionKey(user._id, { "last_keep_date": new Date() });
        await closeImap(myImap);
    };

    Static.unsubToTrash = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, user.unsub_label, onDisconnect);
        await Label.moveUnsubToTrash(myImap, from_email);
        me.updateUserByActionKey(user._id, { "last_trash_date": new Date() });
        await closeImap(myImap);
    };
    ///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function (user, from_email, onDisconnect) {
        let myImap = await openFolder(user, user.trash_label, onDisconnect);
        await Label.moveTrashToInbox(myImap, from_email);
        me.updateUserByActionKey(user._id, { "last_keep_date": new Date() });
        await closeImap(myImap);
    };

    Static.trashToUnsub = async function (user, from_email) {
        //// not in use
    };

    ////---------------------scrap fresh ==================

    Static.extractEmail = async function (user, reset_cb) {
        let myImap;
        let timeoutconst = setInterval(x => {
            if (!myImap) {
                let event = "user_" + Math.random().toString(36).slice(2);
                me.sendToAppsFlyer(user.email, "process_failed_no_user", { "user": event })
                throw new Error("imap not available" + user._id);
            }
            if (myImap.imap.state === 'disconnected') {
                reset_cb();
                throw new Error("disconnected" + user._id);
            }
        }, 2 * 60 * 1000)
        await me.scanStarted(user._id);
        myImap = await openFolder( user, "INBOX");
        me.sendToAppsFlyer(user.email, "process_started", { time: Date.now() })
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
        let scraper = Scraper.new(myImap);
        await scraper.start(async function afterEnd() {
            console.log("is_finished called");
            me.sendToAppsFlyer(user.email, "process_finished", { time: Date.now() })
            await me.scanFinished(user._id);
            me.updateUserByActionKey(user._id, { "last_scan_date": new Date() });
            await me.handleRedis(user._id);
        });
        clearInterval(timeoutconst);
        myImap.end(myImap.imap);
    }

    Static.extractEmailForCronJob = async function (user) {
        let myImap = await openFolder(user, "INBOX");
        let scraper = Scraper.new(myImap);
        await scraper.update();
        myImap.end(myImap.imap);
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
    }


    Static.extractOnLaunchEmail = async function (user) {
        return;
    }

    Static.validCredentialCheck = async function (user) {
        let myImap = await openFolder(user, "INBOX");
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
            let myImap = await openFolder(user, user.unsub_label);
            let scraper = Scraper.new(myImap);
            await scraper.deletePreviousMessages();
            await closeImap(myImap);
        }

        if (user.trash_label.toLowerCase().indexOf("inbox") == -1) {
            myImap = await openFolder(user, user.trash_label );
            scraper = Scraper.new(myImap);
            await scraper.deletePreviousMessages();
            await closeImap(myImap);
        }
    }

    //////////////////// listen for user //////////////////////
    Static.listenForUser = async function (user, text, new_email_cb) {
        text && console.log(text, user.email);
        let myImap = await openFolder(user, "INBOX");
        myImap.listen(async function (x, y) {
            new_email_cb(x, y);
        });
        myImap.onEnd(x => {
            console.log("ended", myImap.user.email);
            process.nextTick(r => me.listenForUser(user, "restarting for user", new_email_cb));
        });
        myImap.keepCheckingConnection(x => {
            process.nextTick(r => me.listenForUser(user, "restarting for user12", new_email_cb));
        });
        new_email_cb();
    }

    Static.updateForUser = async function (user, reset_cb) {
        let myImap;
        let timeoutconst = setInterval(x => {
            if (!myImap) {
                throw new Error("imap not available" + user._id);
            }
            if (myImap.imap.state === 'disconnected') {
                reset_cb();
                throw new Error("disconnected" + user._id);
            }
        }, 2 * 60 * 1000)
  
        myImap = await openFolder(user, "INBOX");
        let scraper = Scraper.new(myImap);
        if (myImap.user.last_msgId == undefined || myImap.user.last_msgId == "undefined") {
            myImap.user.last_msgId = myImap.box.uidnext;
            await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
        }
        let is_more_than_limit = false;

        await scraper.update(async function latest_id(id, temp) {
            id && (myImap.box.uidnext = id);
            temp && (is_more_than_limit = true);
        });
        clearInterval(timeoutconst);
        myImap.user.last_msgId = myImap.box.uidnext;
        myImap.end(myImap.imap);
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
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
        await me.UserModel.deleteRedisUser(user);
        // delay as active status require to setup listner so that it do not set multi listener for same user
        setTimeout(async () => {
            await me.UserModel.updateInactiveUser(user, { "inactive_at": null });
            await me.notifyListner(user._id.toHexString());
        }, 1000);
        return token;
    }


    Static.extractAllEmail = async function (user, folderName) {
        let lastmsg_id;
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.scrapAll(myImap.box.uidnext);
        let names = await myImap.getLabels();
        lastmsg_id = myImap.box.uidnext;
        myImap.imap.end(myImap.imap);
        await names.asyncForEach(async element => {
            if (element != "INBOX" && (element.indexOf('[') == -1 || element.indexOf('[') == -1)) {
                let myImap = await openFolder(user, element);
                console.log("box name => ",myImap.box.name);
                if (myImap.box.uidnext > lastmsg_id) {
                    lastmsg_id = myImap.box.uidnext;
                }
                let scraper = Scraper.new(myImap);
                let emails = await scraper.scrapAll(myImap.box.uidnext);
                myImap.imap.end(myImap.imap);
            }
        });
        await me.updateLastTrackMessageId(user._id, lastmsg_id)
        return emails;
    }

    Static.extractEmailBySize = async function (user, folderName, smallerThan, largerThan) {
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.size(smallerThan, largerThan);
        myImap.imap.end(myImap.imap);
        return emails;
    }

    Static.extractEmailByDate = async function (user, folderName, data) {
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.byDate(data);
        myImap.imap.end(myImap.imap);
        return emails;
    }

    // this will return all the emails
    Static.extractAllEmails = async function (user, folderName) {
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.getAllEmails();
        myImap.imap.end(myImap.imap);
        return emails;
    }

    Static.deleteQuickMail = async function (user, ids) {
        console.log(user.email);
        console.log(ids);
        let myImap = await openFolder(user, "INBOX");
        await Label.setDeleteFlag(myImap, ids);
        await me.updateForDelete(user._id, ids);
        await closeImap(myImap);
    }

    Static.deleteQuickMailNew = async function (user, ids, box_name) {
        let myImap = await openFolder(user, box_name);
        await Label.setDeleteFlag(myImap, ids);
        await me.updateForDelete(user._id, ids);
        await closeImap(myImap);
    }

});