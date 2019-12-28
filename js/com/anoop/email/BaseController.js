fm.Package('com.anoop.email');
fm.Import("..model.EmailDetail");
fm.Import("..model.EmailInfo");
fm.Import("..model.User");
fm.Import("..model.Token");
fm.Import("..model.Provider");
fm.Import("..model.UserAction");
fm.Import("..model.SenderMail");
fm.Import("..model.EmailData");
fm.Import("..model.EmailTrack");
fm.Import("com.jeet.memdb.RedisDB");
fm.Import(".BaseRedisData");
const AppsflyerEvent = require("../../../../helper/appsflyerEvent").AppsflyerEvent;

fm.Class('BaseController', function (me, EmailDetail, EmailInfo, User, Token, Provider, UserAction, SenderMail, EmailData,EmailTrack, RedisDB, BaseRedisData) {
    'use strict';
    this.setMe = function (_me) {
        me = _me;
    };

    Static.UserModel = User;
    Static.TokenModel = Token;
    Static.EmailDataModel = EmailData;

    Static.sendToAppsFlyer  =async function(user_id, event_name, event_value){
        AppsflyerEvent.sendEventToAppsflyer(user_id, event_name, event_value);
    };

    Static.createSenderMail = async function (fromEamil, user_id) {
        return await SenderMail.findOneAndUpdate({ user_id: user_id, senderMail: fromEamil }, { user_id: user_id, senderMail: fromEamil });
    }

    Static.updateOrCreateAndGetEMailDetailFromData = async function (data, user_id) {
        let emaildetailraw = await EmailDetail.fromEamil(data, user_id);
        return await EmailDetail.updateOrCreateAndGet({ from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id }, emaildetailraw);
    }

    Static.getLastTrackMessageId = async function(uid){
        return await EmailTrack.get({user_id:uid})
    }

    Static.updateForDelete = async function(user_id,ids){
        return await EmailData.updateForDelete({user_id:user_id,email_id:{$in:ids}},{$set:{is_delete:true}});
    }

    Static.storeEmailData = async function(data,user_id){
        let emailData = await EmailData.storeEamil(data,user_id);
        await EmailData.updateOrCreateAndGet({from_email:emailData.from_email,email_id:emailData.email_id,user_id:emailData.user_id,receivedDate:emailData.receivedDate},emailData);
    }

    Static.saveManualEmailData = async function (user_id, data) {
        let emaildetailraw = await EmailDetail.storeEamil(data, user_id);
        return await EmailDetail.updateOrCreateAndGet({ from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id }, emaildetailraw);
    }
    

    Static.saveManualEmailInfoForOutlook = async function (user_id, data) {
        let emaildetail = await me.saveManualEmailData(user_id,data);
        let emailinforaw = await EmailInfo.fromEamil(data, emaildetail._id, null);
        return await EmailInfo.updateOrCreateAndGet({ from_email_id: emaildetail._id, email_id: emailinforaw.email_id }, emailinforaw);
    };

    Static.updateOrCreateAndGetEMailInfoFromData = async function (emaildetail, data, url) {
        let emailinforaw = await EmailInfo.fromEamil(data, emaildetail._id, url);
        return await EmailInfo.updateOrCreateAndGet({ from_email_id: emaildetail._id, email_id: emailinforaw.email_id }, emailinforaw);
    };

    Static.getEmailDetailAndInfos = async function (user_id, from_email) {
        let emaildetail = await EmailDetail.get({ user_id: user_id, from_email: from_email });
        let emailids = await EmailInfo.getEmailIdsByEmailDetail(emaildetail);
        return { emaildetail, emailids };
    };

    Static.updateLastTrackMessageId = async function(uid,last_mId){
        return await EmailTrack.updatelastMsgId({ user_id: uid }, {$set:{ last_msgId:last_mId }});
    }

    Static.removeUserByState = async function(state){
        return await User.removeUserByState({state:state});
    }

    Static.updateEmailInfoForOutlook = async function (email_id, new_email_id) {
        return await EmailInfo.updateEmailInfo({ email_id: email_id }, { email_id: new_email_id });
    }

    Static.scanFinished = async function (user_id) {
        await RedisDB.setData(user_id, "is_finished", true);
    };

    Static.updateUserByActionKey = async function (user_id, value) {
        //return await UserAction.updateByKey({ _id: user_id }, value);
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


    Static.scanStartedQuickClean = async function (user_id) {
        await RedisDB.setData(user_id, "is_finished_quick_clean", false);
    }

    Static.scanFinishedQuickClean = async function (user_id) {
        await RedisDB.setData(user_id, "is_finished_quick_clean", true);
    };
    
    Static.isScanFinishedQuickClean = async function (user_id) {
        return await RedisDB.getData(user_id, "is_finished_quick_clean");
    }


    Static.createUser = async function (email, passsword, trash_label) {
        return await User.create({ email, passsword, trash_label });
    }

    Static.createOutlookUser = async function (stateCode) {
        return await User.createForOutlook({ stateCode });
    }

    Static.getByState = async function (state) {
        return await User.getByState({ state });
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
        return await User.updateUser({ email: email }, {$set: {
            unsub_label,
            trash_label,
            password,
            "email_client": "imap"
        }});
    };

    Static.updateTrashLabelUser = async function (email, trash_label) {
        console.warn("setting new label", trash_label);
        return await User.updateUser({ email: email }, {$set:{
            trash_label,
            "email_client": "imap"
        }});
    };

    Static.getByEmailAndClient = async function(userInfo){
        return await User.getByEmailAndClient({email:userInfo.preferred_username,email_client:"outlook"})
    }

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

    Static.sendMailToScraper = async function (data, user, getBodyCB,is_get_body) {
        await BaseRedisData.sendMailToScraper(data, user, getBodyCB,is_get_body);
    };

    Static.notifyListner = async function (user_id) {
        await RedisDB.notifyListner(user_id);
    };

    Static.onNewUser = function (cb) {
        RedisDB.onNewUser(cb);
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

    Static.sendToProcessServer = async function(user_id){
        RedisDB.sendNewUserProcess('process_user_login', user_id);
    };

    Static.getUserAnalyzed = async function (emailDetailsWithInfo,userEmailAnalyziedData) {
        emailDetailsWithInfo.forEach((emaildata, index) => {
            let oneWeekBeforeInMillisecond = 7 * 24 * 60 * 60 * 1000
            let oneWeekBefore = new Date(Date.now()-oneWeekBeforeInMillisecond);
            let status_date = new Date(emaildata.status_date)
            console.log(`${status_date}---${oneWeekBefore}---${new Date()}`);
            if (!(status_date >= oneWeekBefore && status_date <= new Date())){
                emailDetailsWithInfo.splice(index, 1);
            }
        });        

        userEmailAnalyziedData.totalProviders = emailDetailsWithInfo.length;

        let allProviderEmails = emailDetailsWithInfo.map(provider => { return provider.from_email })
        userEmailAnalyziedData["providerEmails"] = allProviderEmails;

        allProviderEmails.forEach(email => {
            if (email.includes('bank') || email.includes('axis') || email.includes('kotak')
                || email.includes('sbi') || email.includes('icici') || email.includes('hdfc')) {
                userEmailAnalyziedData.mailCategories.banking.push(email)
            }
            else if (email.includes('shop') || email.includes('amazon') || email.includes('flipkart')
                || email.includes('myntra') || email.includes('ebay') || email.includes('buy')) {
                userEmailAnalyziedData.mailCategories.ecommerce.push(email)
            }
            else if (email.includes('job') || email.includes('guru') || email.includes('naukri')
                || email.includes('internshala') || email.includes('monster') || email.includes('indeed')) {
                userEmailAnalyziedData.mailCategories.jobs.push(email)
            }
            else if (email.includes('social') || email.includes('google') || email.includes('linked')
                || email.includes('facebook') || email.includes('insta') || email.includes('tiktok')) {
                userEmailAnalyziedData.mailCategories.social.push(email)
            }
            else {
                userEmailAnalyziedData.mailCategories.others.push(email)
            }
        });

        let unusedStatusCount = emailDetailsWithInfo.filter(x => { return x.status == "unused" }).length
        userEmailAnalyziedData['unused'] = unusedStatusCount;

        let totalEmailCount = 0;
        emailDetailsWithInfo.forEach(provider => {
            totalEmailCount += provider.emailInfo.length;
        });
        userEmailAnalyziedData['totalEmails'] = totalEmailCount;

        return userEmailAnalyziedData;
    }

});
