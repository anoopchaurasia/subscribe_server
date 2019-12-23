fm.Package("com.anoop.model");
const mongoEmailTrack = require('../../../../models/emailTrack');
fm.Class("EmailTrack>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query, "_id");
        return await mongoEmailTrack.findOne(query).exec();
    };
    
    Static.updatelastMsgId = async function (query, set) {
        me.updateQueryValidation(query, "_id");
        return await mongoEmailTrack.findOneAndUpdate(query, set,{upsert:true}).exec();
    };

});