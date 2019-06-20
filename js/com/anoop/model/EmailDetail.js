fm.Package("com.anoop.model");
const mongo_emaildetail = require('../../../../models/emailDetails');
fm.Class("EmailDetail>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(query){
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOne(query).exec();
    };

    Static.updateStatus = async function(query, status) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOneAndUpdate(query, {$set: {status}}).exec();
    };

    Static.updateOrCreateAndGet = async function(query, set) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOneAndUpdate(query, {$setOnInsert: set}, {new: true, upsert: true}).exec();
    };

    Static.getIfExist = async function (){
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOne(query);
    };

    Static.isEmailMovable = async function(from_email) {
        let totalAvailable = await mongo_emaildetail.estimatedDocumentCount({ "from_email": from_email, "status": { $in: ["move", "trash"] } }).catch(err => { console.error(err.message, err.stack); });
        if (totalAvailable >= 2) {
            return true;
        }
        return false;
    };

    Static.fromEamil = function(emaildata, user_id){
        return {
            user_id,
            labelIds: emaildata.labelIds,
            from_email: emaildata.from_email,
            from_email_name: emaildata.from_email_name,
            to_email: emaildata.to_email,
            status: "unused",
            status_date: new Date
        }
    }

});