fm.Package("com.anoop.model");
const mongoprovider = require('../../../../models/provider');
fm.Class("Provider>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(query){
        me.updateQueryValidation(query, "domain_name");
        return await mongoprovider.findOne(query).exec();
    };

});