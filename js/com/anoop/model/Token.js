fm.Package("com.anoop.model");
const uniqid = require('uniqid');
const token_model = require('../../../../models/tokeno');
fm.Import("...jeet.RedisDB");
fm.Import(".User")
fm.Class("Token>.BaseModel", function (me, RedisDB, User) {
    this.setMe = _me => me = _me;

    Static.create = async function(user){
        var token_uniqueid = uniqid() + uniqid() + uniqid()+ uniqid()+ uniqid();
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

    Static.getUserByToken = async function (token){
        let user = await RedisDB.base.getData(token);
        if(user) return JSON.parse(user);
        let doc = await token_model.findOne({ "token": token }).exec();
        user = await User.get({_id: doc.user_id});
        await RedisDB.base.setData(token, JSON.stringify(user));
        RedisDB.base.setExpire(token, 30*60*1000);
        return user;
    };

});