fm.Package("com.anoop.model");
const mongoEmailState = require('../../../../models/ecomState');
fm.Class("EcomState>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    
    Static.updateState = async function (query, set) {
        me.updateQueryValidation(query, "_id");
        return await mongoEmailState.findOneAndUpdate(query, set,{upsert:true}).exec();
    };

});