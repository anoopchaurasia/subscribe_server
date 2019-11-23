fm.Package("com.anoop.model");
const mongouseraction = require('../../../../models/userAction');
fm.Class("UserAction>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query, "_id");
        return await mongouseraction.findOne(query).exec();
    };

    Static.updateByKey = async function(query,set){
        me.updateQueryValidation(query, "_id");
        return await mongouseraction.findOneAndUpdate(query, { '$set': set}, { upsert: true }).exec();
    }

});