fm.Package('com.anoop.email');
fm.Import("..model.EmailDetail");
fm.Import("..model.EmailInfo");
fm.Import("..model.User");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Class('BaseController', function (me, EmailDetail, EmailInfo, User) {
    'use strict';
    this.setMe = function (_me) {
        me = _me;
    };

    Static.updateOrCreateAndGetEMailDetailFromData = async function(data, user_id){
        let emaildetailraw =await EmailDetail.fromEamil(data, user_id);
        // console.log(emaildetailraw,"new record saving")

        return await EmailDetail.updateOrCreateAndGet({from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id}, emaildetailraw);
    }
    Static.updateOrCreateAndGetEMailInfoFromData = async function(emaildetail, data, url){
        let emailinforaw =await  EmailInfo.fromEamil(data, emaildetail._id, url);
        return await EmailInfo.updateOrCreateAndGet({from_email_id: emaildetail._id, email_id: emailinforaw.email_id}, emailinforaw);
    };

    Static.getEmailDetailAndInfos = async function (user_id, from_email) {
        let emaildetail = await EmailDetail.get({user_id: user_id, from_email: from_email});
        let emailids = await EmailInfo.getEmailIdsByEmailDetail(emaildetail);
        return {emaildetail, emailids};
    };


    Static.updateLastMsgId = async function (_id, msg_id) {
        return await User.updatelastMsgId({ _id: _id }, { last_msgId: msg_id });
    }

    Static.getUserById = async function(user_id) {
        return await User.get({_id: user_id});
    };

    Static.getEmailDetail = async function (user_id, from_email) {
        return await EmailDetail.get({user_id: user_id, from_email: from_email});
    };

    Static.isEmailMovable = async function(from_email){
        await EmailDetail.isEmailMovable(from_email);
    };

    Static.dataToEmailDetailRaw = function(data, user_id){
        return EmailDetail.fromEamil(data, user_id);
    }

    Static.getEmailDetailFromData = async function(emaildetailraw) {
        return await EmailDetail.get({ user_id: emaildetailraw.user_id, from_email: emaildetailraw.from_email});
    };

    Static.updateEmailDetailStatus = async function(_id, status) {
        return await EmailDetail.updateStatus({_id: _id},  status);
    };

    Static.inboxToUnsubBySender = async function(token, sender_email){
        let emailinfos = await commonBySender(token, sender_email, "move");
        await Emailinfo.bulkInsert(emailinfos);
    };

    async function commonBySender(token, sender_email, status) {
        let gmailInstance = await Gmail.getInstanceForUser(user_id);
        let scraper = Scraper.new(gmailInstance);
        let ids = await scraper.getEmaiIdsBySender(sender_email);
        if(ids.length==0) {
            throw new Error("no email fond for sender", sender_email, user_id);
        }
        let emaildetail_raw = EmailDetail.fromEamil({from_email: sender_email, from_email_name: sender_email, to_email: null}, user_id);
        emaildetail_raw.status = status;
        let emaildetail = await EmailDetail.updateOrCreateAndGet({user_id: user_id, from_email: sender_email}, emaildetail_raw);
        
        return  ids.map(x=> {
            return Emailinfo.fromEamil({email_id: x, labelIds:[]}, emaildetail._id);
        });

    }
    
    Static.inboxToTrashBySender = async function(token, sender_email) {
        let emailinfos =  await commonBySender(token, sender_email, "trash");
        await Emailinfo.bulkInsert(emailinfos);
    }


    Static.getUnusedEmails = async function (token) {
        let emaildetails = await EmailDetail.getMultiple({ "status": "unused", "user_id": token.user_id },  { from_email: 1, from_email_name: 1 })
        let senddata = await EmailInfo.getBulkCount([{
                $match: {from_email_id:{$in: emaildetails.map(x=>x._id)}},
            }, {
                $group:{_id: "$from_email_id", count:{$sum:1}}
        }]);
        let mapper = {};
        emaildetails.forEach(x=> mapper[x._id] = {a: x.from_email_name, b: x.from_email });
        senddata.forEach(x=> {
            x.from_email_name=mapper[x._id].a;
            x.from_email=mapper[x._id].b;
            x._id = {from_email: mapper[x._id].b, _id: x._id}
        });
        return senddata;
    };

    Static.getUnreadCount = async function (emaildetails) {
        
    }

    Static.handleRedis = async function(user_id, del_data=true){
        let keylist = await RedisDB.getKEYS(user_id);
        if (keylist && keylist.length != 0) {
            await keylist.asyncForEach(async element => {
                let mail = await RedisDB.popData(element);
                if (mail.length != 0) {
                    let result = await RedisDB.findPercent(mail);
                    if (result) {
                        let from_email_id = await me.updateOrCreateAndGetEMailDetailFromData(JSON.parse(mail[0]), user_id)
                        console.log(from_email_id)
                        await EmailInfo.bulkInsert(mail,from_email_id._id);
                    }
                }
            });
            del_data && await RedisDB.delKEY(keylist);
        }
    }
});