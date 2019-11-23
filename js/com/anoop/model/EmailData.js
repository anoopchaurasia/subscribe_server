fm.Package("com.anoop.model");
const mongo_emaildata = require('../../../../models/emailsData');
fm.Class("EmailData>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(query){
        me.updateQueryValidation(query);
        return await mongo_emaildata.findOne(query).exec();
    };

    Static.updateOrCreateAndGet = async function(query, set) {
        me.updateQueryValidation(query);
        return await mongo_emaildata.findOneAndUpdate(query, {$set: set}, { upsert: true}).exec();
    };


    Static.storeEamil = function (emaildata, user_id) {
        return {
            user_id,
            from_email: emaildata.from_email,
            email_id: emaildata.email_id,
            subject: emaildata.subject,
            size: emaildata.size,
            receivedDate: emaildata.receivedDate,
            status:emaildata.status,
            labelIds:emaildata.labelIds
        }
    }

});