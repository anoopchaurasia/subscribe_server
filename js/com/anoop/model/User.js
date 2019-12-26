fm.Package("com.anoop.model");
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
        return me.updateUserById({_id: user._id},  {$set: {last_msgId}});
    };

    Static.getLastMsgId = async function(user){
        return await RedisDB.base.getData("last_msgId->"+user._id.toHexString());
    };

    Static.updateInactiveUser = async function (query,set) {
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
        return await mongouser.deleteOne({ _id: user._id }).exec().catch(err => {
            console.error(err.message, err.stack, "delete6");
        });
    };

    Static.getCursor = async function(query, filter={}, offset=0){
        return await mongouser.find(query, filter).skip(offset).lean().cursor()
    };
});