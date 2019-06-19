fm.Package("com.anoop.model");
const mongo_emaildetail = require('../../../../models/emailDetails');
fm.Class("EmailDetail>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(query){
        me.updateQueryValidation();
        return await mongo_emaildetail.findOne(query).exec();
    };

    Static.updateStatus = async function(query, status) {
        me.updateQueryValidation();
        return await mongo_emaildetail.findOneAndUpdate(query, {$set: {status}}).exec();
    };
});