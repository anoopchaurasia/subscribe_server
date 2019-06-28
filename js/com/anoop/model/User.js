fm.Package("com.anoop.model");
const mongouser = require('../../../../models/user');
fm.Class("User>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(query){
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOne(query).exec();
    };

});