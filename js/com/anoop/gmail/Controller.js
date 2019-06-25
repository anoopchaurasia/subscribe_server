fm.Package("com.anoop.gmail");
fm.Import(".Gmail");
fm.Import(".Scraper");
fm.Import(".Label");
fm.Class("Controller>com.anoop.email.BaseController", function(me, Gmail, Scraper, Label){
    this.setMe=_me=>me=_me;

    ///------------------------------------- from unused ---------------------///
    
    Static.unusedToKeep = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        me.updateEmailDetailStatus(emaildetail._id, "keep");
    };

    Static.unusedToTrash = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        await Label.moveInboxToTrash(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "trash");
    };

    Static.unusedToUnsub = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        await Label.moveInboxToUnsub(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "move");
    };

///---------------------------------------from unsub folder--------------------///
    
    Static.unsubToKeep = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        await Label.moveUnsubToInbox(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "keep");
    };

    Static.unsubToTrash = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        await Label.moveUnsubToTrash(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "trash");
    };
///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        await Label.moveTrashToInbox(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "keep");
    };

    Static.trashToUnsub = async function(token, from_email){
        let {emaildetail, emailids} = await me.getEmailDetailAndInfos(token, from_email);
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        await Label.moveTrashToInbox(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "unsub");
    };

    //-----------------------------by sender id--------------------------------------//


    Static.inboxToUnsubBySender = async function(token, sender_email){
        let {emaildetail, ids} = await commonBySender(token, sender_email, "move");
        Label.bulkUNusedToUnsub(emaildetail)
    };

    async function commonBySender(token, sender_email, status) {
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        let scraper = Scraper.new(gmailInstance);
        let ids = await scraper.getEmaiIdsBySender(sender_email);
        if(ids.length==0) {
            throw new Error("no email fond for sender", sender_email, user_id);
        }        
        let emaildetail = me.updateOrCreateAndGetEMailDetailFromData({from_email: sender_email, from_email_name: sender_email, to_email: null}, token.user_id);
        let emailinfos = ids.map(x=> {
            return Emailinfo.fromEamil({email_id: x, labelIds:[]}, emaildetail._id);
        });
        await me.insertBulkEmailDetail(emailinfos);
        return {emaildetail, ids: emailinfos.map(x=>x.email_id)};
    }
    
    Static.inboxToTrashBySender = async function(token, sender_email) {
        let emailinfos =  await commonBySender(token, sender_email, "trash");
        await Emailinfo.bulkInsert(emailinfos);
    }


    ////---------------------scrap fresh ==================

    Static.extractEmail = async function(token){
        let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
        let scraper = Scraper.new(gmailInstance);
        scraper.start(me, async function afterEnd(){
           await me.handleRedis(token.user_id);
        });
    }

    Static.getUnusedEmails = async function (token) {
        // let emaildetails = await EmailDetail.getUnused({ "status": "unused", "user_id": user_id },  { from_email: 1, from_email_name: 1 })
        // let senddata = await EmailInfo.getBulkCount(emaildetails.map(x=>x._id));
        // let mapper = {};
        // emaildetails.forEach(x=> mapper[x._id] = {a: x.from_email_name, b: x.from_email });
        // senddata.forEach(x=> {
        //     x.from_email_name=mapper[x._id].a;
        //     x.from_email=mapper[x._id].b;
        // })
        // return senddata;
    }

    
});