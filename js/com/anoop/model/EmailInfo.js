fm.Package("com.anoop.model");
const mongo_emailInfo = require('../../../../models/emailInfo');

fm.Class("EmailInfo", function(me){
    this.setMe=_me=>me=_me;

    Static.getEmailIdsByEmailDetail = async function(emaildetail){
        let emails = await mongo_emailInfo.find({ "from_email_id": emaildetail._id }, { "email_id": 1, _id: 0 });
        return emails.map(x=>x.email_id);
    };
});