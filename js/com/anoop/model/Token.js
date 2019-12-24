fm.Package("com.anoop.model");
const uniqid = require('uniqid');
let ObjectId = require("mongoose").Types.ObjectId;
const token_model = require('../../../../models/tokeno');
fm.Import("...jeet.memdb.RedisDB");
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
    };

    Static.getLastClientToken = async function(user){
        return (await token_model.find({user_id:user._id}, {token:1, _id:0}).sort({_id:1}).limit(1).lean().exec())[0].token
    };

    Static.getUserByToken = async function (token){
        let user = await RedisDB.base.getData(token);
        if(user) {
            user = JSON.parse(user);
            user._id = ObjectId(user._id);
            console.log(user._id);
            return user;
        }
        token = await token_model.findOne({ "token": token }).exec();
        user = await User.get({_id: token.user_id});
        user._id = user._id.toHexString();
        await RedisDB.base.setData(token.token, JSON.stringify(user));
        RedisDB.base.setExpire(token.token, 30*60*1000);
        return user;
    };
});