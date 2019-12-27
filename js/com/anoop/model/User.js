fm.Package("com.anoop.model");
let ObjectId = require("mongoose").Types.ObjectId;
const mongouser = require('../../../../models/user');
fm.Import("...jeet.memdb.RedisDB");
fm.Class("User>.BaseModel", function (me, RedisDB) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOne(query).lean().exec();
    };
    
    Static.getByEmail = async function (query) {
        me.updateQueryValidation(query, "email");
        return await mongouser.findOne(query).lean().exec();
    };

    Static.updatelastMsgId = async function (user, last_msgId) {
        if(user.last_msgId == last_msgId) return;
        await RedisDB.base.setData("last_msgId->"+user._id.toHexString(), last_msgId);
        let query = {_id: user._id};
        let set = {$set: {last_msgId}}
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOneAndUpdate(query, set).exec();
    };

    Static.getLastMsgId = async function(user){
        return await RedisDB.base.getData("last_msgId->"+user._id.toHexString());
    };

    Static.deleteRedisUser = async function (user) {
        console.log("deleting redis user ");
        if(!user._id) {
            return console.error("user dont have _id", user);
        }
        return await RedisDB.delKEY("u_"+user._id.toHexString());
    };

    Static.updateInactiveUser = async function (user, set, query) {
        me.deleteRedisUser(user);
        query = query || {_id: user._id};
        me.updateQueryValidation(query, "_id");
        console.log(query, set);
        return await mongouser.findOneAndUpdate(query, { '$set': set}).exec();
    };

    Static.updateUser = async function (query, set) {
        me.updateQueryValidation(query, "email");
        return await mongouser.findOneAndUpdate(query, set, { upsert: true }).exec();
    };

    Static.updateUserById = async function (query, set) {
        me.updateQueryValidation(query, "_id");
        me.deleteRedisUser(query);
        return await mongouser.findOneAndUpdate(query, set).exec();
    };

    Static.create = async function(query){
        var newUser = new mongouser({
            "email": query.email,
            "password": query.password,
            "trash_label": query.trash_label,
            "email_client": "imap",
            "primary_email":query.email
        });
        return await newUser.save().catch(err => {
            console.error(err.message, err.stack);
        });
    };

    Static.getByEmailAndClient = async function (query) {
        me.updateQueryValidation(query, "email");
        return await mongouser.findOne(query).exec();
    };

    Static.removeUserByState = async function (query) {
        me.updateQueryValidation(query, "state");
        return await mongouser.remove(query).exec();
    };

    Static.getByState = async function (query) {
        me.updateQueryValidation(query, "state");
        return await mongouser.findOne(query).exec();
    };

    Static.updateUserInfoOutlook = async function (query, set) {
        me.updateQueryValidation(query, "email");
        return await mongouser.findOneAndUpdate(query, set, { upsert: true }).exec();
    };

    Static.updateUserInfoOutlookWithState = async function(query,set){
        me.updateQueryValidation(query, "state");
        return await mongouser.findOneAndUpdate(query, set, { upsert: true }).exec();
    }

    Static.createForOutlook = async function(query){
        var newUser = new mongouser({
            "state": query.stateCode,
            "email": query.stateCode,
            "email_client": "outlook",
        });
        return await newUser.save().catch(err => {
            console.error(err.message, err.stack);
        });
    };;

    Static.deleteMe = async function(user){
        await me.deleteRedisUser(user);
        return await mongouser.deleteOne({ _id: user._id }).exec().catch(err => {
            console.error(err.message, err.stack, "delete6");
        });
    };

    Static.getCursor = async function(query, filter={}, offset=0){
        return await mongouser.find(query, filter).skip(offset).lean().cursor()
    };

    Static.getRedisUser = async function(user_id){
        let key= "u_"+user_id
        let user = await RedisDB.base.getJSON(key);
        if(user) {
            user._id = ObjectId(user._id);
            console.log("got redis user");
            return user;
        }
        console.warn("missing redis user");
        user  = await me.get({_id: ObjectId(user_id) });
        if(!user) {
            console.error("user not found")
            return null;
        }
        ["image_url",
        "name",
            "family_name",
            "given_name",
            "birth_date",
            "last_name",
            "gender",
            "primary_email",
            "inactive_reason"].forEach(x=>{
                delete user[x];
        });
        let u = {...user};
        u._id = u._id.toHexString()
        await RedisDB.base.setJSON(key, u);
        RedisDB.base.setExpire(key, 15*60*1000);
        return user;
    };
});