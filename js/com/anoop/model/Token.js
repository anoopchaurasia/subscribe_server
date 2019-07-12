fm.Package("com.anoop.model");
const uniqid = require('uniqid');
const token_model = require('../../../../models/tokeno');
fm.Class("Token>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.create = async function(user){
        var token_uniqueid = uniqid() + uniqid() + uniqid();
        var tokmodel = new token_model({
            "user_id": user._id,
            "token": token_uniqueid,
            "created_at": new Date()
        });
        await tokmodel.save().catch(err => {
            console.error(err.message, err.stack);
        });
        return {
            "tokenid": token_uniqueid,
            "user": user
        };
    }

});