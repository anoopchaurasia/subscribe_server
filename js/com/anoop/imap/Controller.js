fm.Package("com.anoop.imap");
fm.Import(".MyImap");
fm.Import(".Scraper");
fm.Import(".Label");
const mongouser = require('../../../../models/user');
fm.Class("Controller>com.anoop.email.BaseController", function(me, MyImap, Scraper, Label){
    this.setMe=_me=>me=_me;

    ///------------------------------------- from unused ---------------------///
    
    Static.unusedToKeep = async function(token, from_email){
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        me.updateEmailDetailStatus(emaildetail._id, "keep");
    };

    Static.unusedToTrash = async function(token, from_email){
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("INBOX");
        let { emaildetail, emailids } = await me.getEmailDetailAndInfos(token.user_id,from_email);
        await Label.moveInboxToTrash(myImap,emailids);
        await myImap.closeFolder();
        await me.updateEmailDetailStatus(emaildetail._id, "trash");
        myImap.end();
    };

    Static.unusedToUnsub = async function(token, from_email){
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("INBOX");
        let { emaildetail, emailids } = await me.getEmailDetailAndInfos(token.user_id, from_email);
        console.log(emailids)
        await Label.moveInboxToUnsub(myImap, emailids);
        await myImap.closeFolder();
        await me.updateEmailDetailStatus(emaildetail._id, "move");
        myImap.end();
    };

    Static.automaticInboxToUnsub = async function (user_id, email_id) {
        let user = await me.getUserById(user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("INBOX");
        console.log(email_id,"here automatic move")
        let email_id_arr = [email_id];
        await Label.moveInboxToUnsub(myImap, email_id_arr);
        await myImap.closeFolder();
        myImap.imap.end(myImap.imap);
    };


    Static.automaticInboxToTrash = async function (user_id, email_id) {
        let user = await me.getUserById(user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("INBOX");
        console.log(email_id, "here automatic move")
        let email_id_arr = [email_id];
        await Label.moveInboxToTrash(myImap, emailids);
        await myImap.closeFolder();
        myImap.imap.end(myImap.imap);
    };


    ///------------------------------------- from keep ---------------------///

    Static.keepToTrash = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("INBOX");
        await Label.moveActiveToTrash(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "trash");
        myImap.end();
    };

    Static.keepToUnsub = async function (token, from_email) {
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("INBOX");
        await Label.moveActiveToUnsub(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "move");
        myImap.end();
    };

///---------------------------------------from unsub folder--------------------///
    
    Static.unsubToKeep = async function(token, from_email){
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("Unsubscribed Emails");
        await Label.moveUnsubToInbox(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "keep");
        myImap.end();
    };

    Static.unsubToTrash = async function(token, from_email){

        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder("Unsubscribed Emails");
        await Label.moveUnsubToTrash(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "trash");
        myImap.end();
    };
///------------------------------------from trash folder---------------------///

    Static.trashToKeep = async function(token, from_email){
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        await myImap.openFolder(myImap.user.trash_label);
        await Label.moveTrashToInbox(myImap, from_email);
        await myImap.closeFolder();
        let emaildetail = await me.getEmailDetail(token.user_id, from_email);
        await me.updateEmailDetailStatus(emaildetail._id, "keep");
        myImap.end();
    };

    Static.trashToUnsub = async function(token, from_email){
        let emaildetail = await me.getEmailDetail(token, from_email);
        let gmailInstance = await MyImap.getInstanceForUser(token.user_id);
        await Label.moveTrashToInbox(gmailInstance, emailids);
        me.updateEmailDetailStatus(emaildetail._id, "unsub");
    };

    //-----------------------------by sender id--------------------------------------//


    Static.inboxToUnsubBySender = async function(token, sender_email){
        let {emaildetail, ids} = await commonBySender(token, sender_email, "move");
        Label.bulkUNusedToUnsub(emaildetail)
    };

    async function commonBySender(token, sender_email, status) {
        let gmailInstance = await MyImap.getInstanceForUser(token.user_id);
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
        let user = await me.getUserById(token.user_id);
        let myImap = await MyImap.new(user);
        await myImap.connect();
        let box = await myImap.openFolder("INBOX");
        console.log(box);
        await mongouser.findOneAndUpdate({ _id: token.user_id }, { last_msgId: box.uidnext }, { upsert: true })
        let scraper = Scraper.new(myImap);
        await scraper.start();
       // myImap.end();
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