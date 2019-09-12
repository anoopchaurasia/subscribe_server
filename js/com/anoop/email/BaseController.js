fm.Package('com.anoop.email');
fm.Import("..model.EmailDetail");
fm.Import("..model.EmailInfo");
fm.Import("..model.User");
fm.Import("..model.Token");
fm.Import("..model.Provider");
fm.Import("..model.UserAction");
fm.Import("..model.SenderMail");
fm.Import("com.jeet.memdb.RedisDB");
fm.Import(".BaseRedisData");
fm.Class('BaseController', function (me, EmailDetail, EmailInfo, User, Token, Provider, UserAction, SenderMail, RedisDB, BaseRedisData) {
    'use strict';
    this.setMe = function (_me) {
        me = _me;
    };

    Static.createSenderMail = async function(fromEamil,user_id){
        return await SenderMail.findOneAndUpdate({user_id:user_id,senderMail:fromEamil},{user_id:user_id,senderMail:fromEamil});
    }

    Static.updateOrCreateAndGetEMailDetailFromData = async function (data, user_id) {
        let emaildetailraw = await EmailDetail.fromEamil(data, user_id);
        return await EmailDetail.updateOrCreateAndGet({ from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id }, emaildetailraw);
    }

    Static.saveManualEmailData = async function (user_id, data) {
        let emaildetailraw = await EmailDetail.storeEamil(data, user_id);
        return await EmailDetail.updateOrCreateAndGet({ from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id }, emaildetailraw);
    }

    Static.updateOrCreateAndGetEMailInfoFromData = async function (emaildetail, data, url) {
        let emailinforaw = await EmailInfo.fromEamil(data, emaildetail._id, url);
        return await EmailInfo.updateOrCreateAndGet({ from_email_id: emaildetail._id, email_id: emailinforaw.email_id }, emailinforaw);
    };

    Static.getEmailDetailAndInfos = async function (user_id, from_email) {
        let emaildetail = await EmailDetail.get({ user_id: user_id, from_email: from_email });
        let emailids = await EmailInfo.getEmailIdsByEmailDetail(emaildetail);
        return { emaildetail, emailids };
    };

    Static.updateLastMsgId = async function (_id, msg_id) {
        return await User.updatelastMsgId({ _id: _id }, { last_msgId: msg_id });
    }

    Static.updateInactiveUser = async function (_id) {
        return await User.updateInactiveUser({ _id: _id, inactive_at: null }, { "inactive_at": new Date() });
    };

    Static.updateEmailInfoForOutlook = async function(email_id,new_email_id){
        return await EmailInfo.updateEmailInfo({email_id:email_id},{email_id:new_email_id});
    }

    Static.reactivateUser = async function (_id) {
        return await User.updateInactiveUser({ _id: _id }, { "inactive_at": null });
    };

    Static.scanFinished = async function (user_id) {
        await RedisDB.setData(user_id, "is_finished", true);
    };

    Static.updateUserByActionKey = async function (user_id, value) {
        return await UserAction.updateByKey({ _id: user_id }, value);
    }

    Static.getUserActionData = async function (user_id) {
        return await UserAction.get({ _id: user_id });
    }

    Static.scanStarted = async function (user_id) {
        await RedisDB.setData(user_id, "is_finished", false);
    }

    Static.isScanFinished = async function (user_id) {
        return await RedisDB.getData(user_id, "is_finished");
    }

    Static.createUser = async function (email, passsword, trash_label) {
        return await User.create({ email, passsword, trash_label });
    }

    Static.createOutlookUser = async function (stateCode) {
        return await User.createForOutlook({ stateCode });
    }

    Static.getByState = async function(state){
        return await User.getByState({state});
    }

    Static.updateExistingUserInfoOutlook = async function (userInfo, state) {
        var userdata = {
            name: userInfo.name,
            state: state,
            email_client: "outlook",
            inactive_at: null,
            primary_email: userInfo.preferred_username
        };
        return await User.updateUserInfoOutlook({ email: userInfo.preferred_username, email_client: "outlook" },
            { $set: userdata });
    };

    Static.updateNewUserInfoOutlook = async function (userInfo, state) {
        var userdata = {
            email: userInfo.preferred_username ? userInfo.preferred_username : '',
            name: userInfo.name,
            email_client: "outlook",
            inactive_at: null,
            primary_email: userInfo.preferred_username ? userInfo.preferred_username : ''
        };
        return await User.updateUserInfoOutlookWithState({ state: state },
            { $set: userdata });
    };

    Static.createToken = async function (user) {
        return await Token.create(user);
    }

    Static.getUserById = async function (user_id) {
        return await User.get({ _id: user_id });
    };

    Static.getUserByEmail = async function (email) {
        return await User.getByEmail({ email: email });
    }

    Static.updateUser = async function (email, unsub_label, trash_label, password) {
        return await User.updateUser({ email: email }, {
            unsub_label,
            trash_label,
            password,
            "email_client": "imap"
        });
    };

    Static.updateUserById = async function (key, set) {
        return await User.updateUserById(key, set);
    };

    Static.getProvider = async function (domain) {
        return await Provider.get({ "domain_name": domain });
    };

    Static.getEmailDetail = async function (user_id, from_email) {
        return await EmailDetail.get({ user_id: user_id, from_email: from_email });
    };

    Static.isEmailMovable = async function (from_email) {
        await EmailDetail.isEmailMovable(from_email);
    };

    Static.dataToEmailDetailRaw = function (data, user_id) {
        return EmailDetail.fromEamil(data, user_id);
    }

    Static.getEmailDetailFromData = async function (emaildetailraw) {
        return await EmailDetail.get({ user_id: emaildetailraw.user_id, from_email: emaildetailraw.from_email });
    };

    Static.updateEmailDetailStatus = async function (_id, status) {
        return await EmailDetail.updateStatus({ _id: _id }, status);
    };

    Static.updateEmailDetailByFromEmail = async function (user_id, from_email, status) {
        return await EmailDetail.updateStatus({ user_id, from_email }, status);
    };

    Static.inboxToUnsubBySender = async function (token, sender_email) {
        let emailinfos = await commonBySender(token, sender_email, "move");
        await Emailinfo.bulkInsert(emailinfos);
    };

    async function commonBySender(token, sender_email, status) {
        let gmailInstance = await Gmail.getInstanceForUser(user_id);
        let scraper = Scraper.new(gmailInstance);
        let ids = await scraper.getEmaiIdsBySender(sender_email);
        if (ids.length == 0) {
            throw new Error("no email fond for sender", sender_email, user_id);
        }
        let emaildetail_raw = EmailDetail.fromEamil({ from_email: sender_email, from_email_name: sender_email, to_email: null }, user_id);
        emaildetail_raw.status = status;
        let emaildetail = await EmailDetail.updateOrCreateAndGet({ user_id: user_id, from_email: sender_email }, emaildetail_raw);
        return ids.map(x => {
            return Emailinfo.fromEamil({ email_id: x, labelIds: [] }, emaildetail._id);
        });
    }

    Static.inboxToTrashBySender = async function (token, sender_email) {
        let emailinfos = await commonBySender(token, sender_email, "trash");
        await Emailinfo.bulkInsert(emailinfos);
    }

    Static.sendMailToScraper = async function (data, user) {
        await BaseRedisData.sendMailToScraper(data, user);
    };

    Static.notifyListner = async function (user_id) {
        await BaseRedisData.notifyListner(user_id);
    };

    Static.onNewUser = function (cb) {
        BaseRedisData.onNewUser(cb);
    };

    Static.getUnusedEmails = async function (token) {
        let emaildetails = await EmailDetail.getMultiple({ "status": "unused", "user_id": token.user_id }, { from_email: 1, from_email_name: 1 })
        let senddata = await EmailInfo.getBulkCount([{
            $match: { from_email_id: { $in: emaildetails.map(x => x._id) } },
        }, {
            $group: { _id: "$from_email_id", count: { $sum: 1 } }
        }]);
        let mapper = {};
        emaildetails.forEach(x => mapper[x._id] = { a: x.from_email_name, b: x.from_email });
        senddata.forEach(x => {
            x.from_email_name = mapper[x._id].a;
            x.from_email = mapper[x._id].b;
            x._id = { from_email: mapper[x._id].b, _id: x._id }
        });
        return senddata;
    };

    Static.getUnreadCount = async function (emaildetails) {

    }

    Static.handleRedis = async function (user_id, del_data = true) {
        let keylist = await RedisDB.getKEYS(user_id);
        if (keylist && keylist.length != 0) {
            console.log(keylist)
            await keylist.asyncForEach(async element => {
                // console.log(element)
                let mail = await RedisDB.popData(element);
                if (mail.length != 0) {
                    let result = await RedisDB.findPercent(mail);
                    if (result) {
                        let from_email_id = await me.updateOrCreateAndGetEMailDetailFromData(JSON.parse(mail[0]), user_id)
                        // console.log(from_email_id)
                        await EmailInfo.bulkInsert(mail, from_email_id._id);
                    }
                }
            });
            del_data && await RedisDB.delKEY(keylist);
        }
    }

});