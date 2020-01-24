fm.Package("com.anoop.imap");
fm.Import(".MyImap");
fm.Import(".Scraper");
fm.Import(".Label");
var googleTranslate = require('google-translate')(process.env.google_translate_api_key);
fm.Class("Controller>com.anoop.email.BaseController", function (me, MyImap, Scraper, Label) {
    this.setMe = _me => me = _me;

    async function openFolder(user, folder, onDisconnect) {
        console.time("openFolder")
        if (!user) {
            throw new Error("user left system " + user)
        }
        let domain = user.email.split("@")[1];
        let provider = await me.getProvider(domain)
        let myImap = await MyImap.new(user, provider);
        console.timeLog("openFolder")
        console.log("got imap instace")
        if (onDisconnect) {
            myImap.keepCheckingConnection(function onFail() {
                onDisconnect();
                setTimeout(() => {
                    throw new Error("imap disconnected!");
                }, 1000)
            }, 120 * 1000);
        }

        await myImap.connect(provider).catch(async err => {
            if (err.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("leaving user as not loggedin reason:", err.message, user.email)
                await me.UserModel.updateInactiveUser(user, { inactive_reason: err.message, inactive_at: new Date }, { _id: user._id, inactive_at: null });
            }
            console.error(err);
            throw new Error(err.message, user.email);
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
        myImap.end();
    };


    Static.updateEmailDetailByFromEmail = async (user_id, from_email, status) => {
        let from_email_array = await getFromEmailArray(from_email);
        await me.updateEmailDetailByFromEmailArray(user_id, from_email_array, status);
    };

    async function getFromEmailArray(from_email) {
        console.log(Array.isArray(from_email))
        return Array.isArray(from_email) ? from_email : [from_email];
    }



    async function commonImapUserAction(user, from_email, onDisconnect, { folder, labelAction }) {
        let from_email_array = await getFromEmailArray(from_email);
        let myImap = await openFolder(user, folder, onDisconnect);
        await from_email_array.asyncForEach(async email => {
            await Label[labelAction](myImap, email);
        });
        await closeImap(myImap);
    }

    ///------------------------------------- userAction ---------------------///

    // Static.updateUserByActionKey = async function(user_id,value){
    //     await me.updateUserByActionKey(user_id,value);
    // }

    ///------------------------------------- from unused ---------------------///

    Static.unusedToKeep = async function () {

    };

    Static.unusedToTrash = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: "INBOX", labelAction: "moveInboxToTrash" });
    };

    Static.unusedToUnsub = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: "INBOX", labelAction: "moveInboxToUnsub" });
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
        myImap.end();
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
        myImap.end();
    };

    ///------------------------------------- from keep ---------------------///

    Static.keepToTrash = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: "INBOX", labelAction: "moveActiveToTrash" });
    };

    Static.keepToUnsub = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: "INBOX", labelAction: "moveActiveToUnsub" });
    }
    ///---------------------------------------from unsub folder--------------------///

    Static.unsubToKeep = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: user.unsub_label, labelAction: "moveUnsubToInbox" });
    };

    Static.unsubToTrash = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: user.unsub_label, labelAction: "moveUnsubToTrash" });
    };
    ///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function (user, from_email, onDisconnect) {
        await commonImapUserAction(user, from_email, onDisconnect, { folder: user.trash_label, labelAction: "moveTrashToInbox" });
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
                me.sendToAppsFlyer(user.af_uid || user.email, "process_failed_no_user", { "user": event });
                reset_cb();
                return setTimeout(() => {
                    throw new Error("imap not available" + user._id);
                }, 1000)
            }
            if (myImap.imap.state === 'disconnected') {
                reset_cb();
                return setTimeout(x => {
                    throw new Error("disconnected" + user._id);
                }, 1000)
            }
        }, 2 * 60 * 1000)
        await me.scanStarted(user._id);
        myImap = await openFolder(user, "INBOX");
        me.sendToAppsFlyer(user.af_uid || user.email, "process_started", { time: Date.now() })
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
        let scraper = Scraper.new(myImap);
        await scraper.start(async function afterEnd(has_ecom) {
            console.log("is_finished called");
            me.sendToAppsFlyer(user.af_uid || user.email, "process_finished", { time: Date.now() })
            await me.scanFinished(user._id);
            me.updateUserByActionKey(user._id, { "last_scan_date": new Date() });
            await me.handleRedis(user._id);
            await setEcommerceData(has_ecom,user);
        });
        clearInterval(timeoutconst);
        myImap.end();
    }

    async function setEcommerceData(is_ecom_user,user){
        let userInfo  = await me.UserModel.getRedisUser(user._id);
        if(!userInfo.af_uid){
            await me.UserModel.deleteRedisUser(user);
            userInfo = await me.UserModel.getRedisUser(user._id);
        }
        if(userInfo.af_uid){
            if(is_ecom_user.has_ecom){
                console.log("ecommerce_user_check_true",userInfo.af_uid);
                await me.sendToAppsFlyer(userInfo.af_uid,"ecommerce_user_true");
            }else{
                console.log("ecommerce_user_check_false",userInfo.af_uid);
                await me.sendToAppsFlyer(userInfo.af_uid,"ecommerce_user_false");
            }
        }else{
            await me.sendToAppsFlyer(userInfo.af_uid,"ecommerce_user_appsid_missing");
        }
        console.log(is_ecom_user);
       await me.EcomState.updateState({user_id:user._id},{$set:{
        "is_flipkart": is_ecom_user.flipkart ,
        "is_amazon": is_ecom_user.amazon 
    }})
    }

    Static.extractEmailForCronJob = async function (user) {
        let myImap = await openFolder(user, "INBOX");
        let scraper = Scraper.new(myImap);
        await scraper.update();
        myImap.end();
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
    }


    Static.extractOnLaunchEmail = async function (user) {
        return;
    }

    Static.validCredentialCheck = async function (user) {
        let myImap = await openFolder(user, "INBOX");
        if (myImap) {
            myImap.end();
            return true
        } else {
            myImap.end();
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
            let myImap = await openFolder(user, user.trash_label);
            let scraper = Scraper.new(myImap);
            await scraper.deletePreviousMessages();
            await closeImap(myImap);
        }
    }

    //////////////////// listen for user //////////////////////
    Static.listenForUser = async function (user, text, new_email_cb) {
        text && console.log(text, user.email);
        let myImap = await openFolder(user, "INBOX");
        myImap.listen(async function (x, y) {
            // listnerUpdate(user, myImap).catch(err=>{
            //     console.error(err);
            // })
            new_email_cb(x, y);
        });
        myImap.onEnd(x => {
            console.log("ended", myImap.user.email);
            process.nextTick(r => me.listenForUser(user, "restarting for user", new_email_cb));
        });
        myImap.keepCheckingConnection(x => {
            process.nextTick(r => me.listenForUser(user, "restarting for user12", new_email_cb));
        });
        // listnerUpdate(user, myImap).catch(err=>{
        //     console.error(err);
        // })
        new_email_cb();
    };

    async function listnerUpdate(user, myImap) {
        let scraper = Scraper.new(myImap);
        let last_msgId = await me.UserModel.getLastMsgId(user);
        if (last_msgId) {
            user.last_msgId = last_msgId;
        } else {
            throw new Error("no last message");
        }
        await scraper.update(async function latest_id(id) {
            id && (myImap.box.uidnext = id);
        });
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
        myImap.user.last_msgId = myImap.box.uidnext;
    }

    Static.updateForUser = async function (user, reset_cb) {
        let myImap;
        let timeoutconst = setInterval(x => {
            if (!myImap) {
                let err = new Error("imap not available " + user.email.split("@")[1])
                reset_cb(err);
                return setTimeout(() => {
                    throw err;
                }, 1000)
            }
            if (myImap.imap.state === 'disconnected') {
                let error = new Error("disconnected " + user.email.split("@")[1])
                reset_cb(error);
                return setTimeout(() => {
                    throw error;
                }, 1000)
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
        myImap.end();
        await me.UserModel.updatelastMsgId(user, myImap.box.uidnext);
        myImap.user.last_msgId = myImap.box.uidnext;
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

    async function getLabelFromGoogleApi(){
        googleTranslate.translate(element, 'en', async function (err, translation) {
            if (translation.translatedText.toLowerCase().indexOf('trash')!=-1) {
                return element;
            } else if (translation.translatedText.toLowerCase().indexOf('bin')!=-1) {
               return element;
            }
        });
    }

    ///////////------------------------ login ------------------------///
    Static.login = async function (email, password, provider, clientAccessMode, ipaddress) {
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
        console.log(names);
        me.storeLabelData(names,provider.provider);
        let labels = names.filter(s => s.toLowerCase().includes('trash'))[0] || names.filter(s => s.toLowerCase().includes('junk'))[0] || names.filter(s => s.toLowerCase().includes('bin'))[0];
        let trash_label = labels;
        console.log(trash_label);
        // if(!trash_label){
        //     trash_label = await getLabelFromGoogleApi(names);
        // }
        let user = await me.getUserByEmail(email);
        if (!user) {
            user = await me.createUser(email, PASSWORD, trash_label);
        }
        if (provider.provider.includes("inbox.lv")) {
            await me.updateUser(email, "INBOX/Unsubscribed Emails", trash_label, PASSWORD);
        } else {
            await me.updateUser(email, "Unsubscribed Emails", trash_label, PASSWORD);
        }
        myImap.end();

        let token;
        if (clientAccessMode == 'web') {
            token = await me.TokenModel.createTokenWeb(user, ipaddress);
        } else {
            token = await me.createToken(user, ipaddress);
        }
        await me.UserModel.deleteRedisUser(user);
        // delay as active status require to setup listner so that it do not set multi listener for same user
        setTimeout(async () => {
            await me.UserModel.updateInactiveUser(user, { "inactive_at": null });
            await me.notifyListner(user._id.toHexString());
        }, 1000);
        return token;
    }


    Static.extractAllEmail = async function (user, reset_cb) {
        let lastmsg_id;
        await me.scanStartedQuickClean(user._id);
        let myImap;
        let timeoutconst = setInterval(x => {
            if (!myImap) {
                let event = "user_" + Math.random().toString(36).slice(2);
                me.sendToAppsFlyer(user.af_uid || user.email, "process_failed_no_user", { "user": event });
                reset_cb();
                return setTimeout(() => {
                    throw new Error("imap not available" + user._id);
                }, 1000)
            }
            console.log(myImap.imap.state);
            if (myImap.imap.state === 'disconnected') {
                reset_cb();
                return setTimeout(x => {
                    throw new Error("disconnected" + user._id);
                }, 1000)
            }
        }, 2 * 60 * 1000)
        myImap = await openFolder(user, "INBOX");
        let names = await myImap.getLabels();
        console.dir(names);
        lastmsg_id = myImap.box.uidnext;
        await closeImap(myImap);
        await names.asyncForEach(async element => {
            if (element != '[Gmail]/All Mail' && element != '[Gmail]/Trash' && element != '[Gmail]/Bin') {//(element.indexOf('[') == -1 || element.indexOf('[') == -1)) {//element != '[Gmail]/All Mail')
                try {
                    let myImap = await openFolder(user, element);
                    console.log("box name => ", myImap.box.name);
                    if (myImap.box.uidnext > lastmsg_id) {
                        lastmsg_id = myImap.box.uidnext;
                    }
                    let scraper = Scraper.new(myImap);
                    await scraper.scrapAll(myImap.box.uidnext);
                    await closeImap(myImap);
                } catch (error) {
                    console.log(error)
                }
            }
        });
        clearInterval(timeoutconst);
        await me.updateLastTrackMessageId(user._id, lastmsg_id)
        console.log("last one came");
        await me.scanFinishedQuickClean(user._id);
    }

    Static.extractEmailBySize = async function (user, folderName, smallerThan, largerThan) {
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.size(smallerThan, largerThan);
        myImap.end();
        return emails;
    }

    Static.extractEmailByDate = async function (user, folderName, data) {
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.byDate(data);
        myImap.end();
        return emails;
    }

    // this will return all the emails
    Static.extractAllEmails = async function (user, folderName) {
        await me.scanStarted(user._id);
        let myImap = await openFolder(user, folderName);
        let scraper = Scraper.new(myImap);
        let emails = await scraper.getAllEmails();
        myImap.end();
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


    Static.getAndReturnLabel = async(user,box_name,onDisconnect)=>{
        let myImap = await openFolder(user,box_name,onDisconnect);
        return {"boxList":await myImap.getLabels(),"provider":myImap.provider.provider};
    }


    Static.makeTrashActionFromAlreadyDeletedMails = async function(from_email, box_name, user,start_date,end_date, onDisconnect) {
        let myImap = await openFolder(user, box_name, onDisconnect);
        let sendids;
        console.log("total delete ]]]=====>", from_email,box_name);
        myImap.keepCheckingConnection(function onFail() {
            console.log("reconnecting as disconnected!");
            myImap.connect();
        }, 120 * 1000);
        let ids = await Label.getAllIdsForDeletedEmails(myImap,from_email,start_date,end_date);
        // console.log(ids)
        while (ids.length) {
            sendids = ids.splice(0, 10000);
            console.log("deleting length", sendids.length);

            // await Label.setDeleteFlag(myImap, sendids);
            if (myImap.provider.provider === "gmail") {
                await Label.moveToTrashForQC(myImap, sendids);
            } else {
                await Label.setDeleteFlag(myImap, sendids);
            }
        }
        console.log("deleted data");
        await closeImap(myImap);
    }

    Static.makeImapDeleteActionForQC =makeImapDeleteActionForQC
    async function makeImapDeleteActionForQC(ids, box_name, user, onDisconnect) {
        let myImap = await openFolder(user, box_name, onDisconnect);
        let sendids;
        console.log("total delete ]]]=====>", ids.length,box_name);
        myImap.keepCheckingConnection(function onFail() {
            console.log("reconnecting as disconnected!");
            myImap.connect();
        }, 120 * 1000);
        
        while (ids.length) {
            sendids = ids.splice(0, 10000);
            console.log("deleting length", sendids.length);
            // await Label.setDeleteFlag(myImap, sendids);
            if (myImap.provider.provider === "gmail") {
                await Label.moveToTrashForQC(myImap, sendids);
            } else {
                await Label.setDeleteFlag(myImap, sendids);
            }
        }
        console.log("deleted data");
        await closeImap(myImap);
    }

    Static.updateDeleteDbBySender = async function (user_id, start_date, end_date, from_emails) {
        await me.EmailDataModel.updateDeleteDbBySender({
            start_date, end_date, user_id, from_emails
        });
    }

    Static.updateDeleteDbByLabel = async function (user_id, start_date, end_date, label_name) {
        await me.EmailDataModel.updateDeleteDbByLabel({
            start_date, end_date, user_id, label_name
        });
    }

    Static.updateDeleteDbBySize = async function (user_id, start_date, end_date, size_group) {
        await me.EmailDataModel.updateDeleteDbBySize({
            start_date, end_date, user_id, size_group
        });
    }


    Static.deleteBySender = async function (user, start_date, end_date, from_emails, onDisconnect) {
        let emails = await me.EmailDataModel.getIdsByFromEmail({
            start_date, end_date, user, from_emails
        })
        await emails.asyncForEach(async data => {
            await getIdsForFromEmail(start_date, end_date, user, from_emails, data, onDisconnect, 0);
        });
    }

    async function getIdsForFromEmail(start_date, end_date, user, from_emails, data, onDisconnect, offset) {
        let edata = await me.EmailDataModel.getIdByBoxAndFromEmail({ start_date, end_date, user, from_emails, box_name: data.key, offset });
        let ids = edata.map(x => x._source.email_id);
        if (ids.length != 0) {
            offset = offset + 5000;
            await makeImapDeleteActionForQC(ids, data.key, user, onDisconnect);
            await getIdsForFromEmail(start_date, end_date, user, from_emails, data, onDisconnect, offset);
        } else {
            return ids.length;
        }
    }

    async function getIdsForLabel(start_date, end_date, user, box_name, onDisconnect, offset) {
        let edata = await me.EmailDataModel.getIdByLabelList({ start_date, end_date, user, box_name, offset });
        let ids = edata.map(x => x._source.email_id);
        if (ids.length != 0) {
            offset = offset + 5000;
            await makeImapDeleteActionForQC(ids, box_name, user, onDisconnect);
            await getIdsForLabel(start_date, end_date, user, box_name, onDisconnect, offset);
        } else {
            return ids.length;
        }
    }

    async function getIdsForSize(start_date, end_date, user, data, onDisconnect, offset) {
        let edata = await me.EmailDataModel.getIdByBox({ start_date, end_date, user, box_name: data.key, offset });
        let ids = edata.map(x => x._source.email_id);
        if (ids.length != 0) {
            offset = offset + 5000;
            await makeImapDeleteActionForQC(ids, data.key, user, onDisconnect);
            await getIdsForSize(start_date, end_date, user, data, onDisconnect, offset);
        } else {
            return ids.length;
        }
    }

    Static.deleteByLabel = async function (user, start_date, end_date, label_name, onDisconnect) {
        await label_name.asyncForEach(async box_name => {
            await getIdsForLabel(start_date, end_date, user, box_name, onDisconnect, 0);
        });
    }


    Static.deleteBySize = async function (user, start_date, end_date, size_group, onDisconnect) {
        let emails = await me.EmailDataModel.getIdsBySize({
            start_date, end_date, user, size_group
        })
        await emails.asyncForEach(async data => {
            await getIdsForSize(start_date, end_date, user, data, onDisconnect, 0);
        });
    }

    Static.deleteQuickMailNew = async function (user, ids, box_name) {
        let myImap = await openFolder(user, box_name);
        await Label.setDeleteFlag(myImap, ids);
        await me.updateForDelete(user._id, ids);
        await closeImap(myImap);
    }

});