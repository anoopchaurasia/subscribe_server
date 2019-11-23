fm.Package("com.anoop.model");
const mongouser = require('../../../../models/emailTrack');
fm.Class("EmailTrack>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOne(query).exec();
    };
    
    Static.updatelastMsgId = async function (query, set) {
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOneAndUpdate(query, set,{upsert:true}).exec();
    };

});