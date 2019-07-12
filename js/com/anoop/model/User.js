fm.Package("com.anoop.model");
const mongouser = require('../../../../models/user');
fm.Class("User>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOne(query).exec();
    };
    Static.getByEmail = async function (query) {
        me.updateQueryValidation(query, "email");
        return await mongouser.findOne(query).exec();
    };

    Static.updatelastMsgId = async function (query, set) {
        me.updateQueryValidation(query, "_id");
        return await mongouser.findOneAndUpdate(query, set, { upsert: true }).exec();
    };

    Static.updateUser = async function (query, set) {
        me.updateQueryValidation(query, "email");
        return await mongouser.findOneAndUpdate(query, set, { upsert: true }).exec();
    };

    Static.create = async function(query){
        var newUser = new mongouser({
            "email": query.email,
            "password": query.password,
            "trash_label": query.trash_label,
            "email_client": "imap"
        });
        return await newUser.save().catch(err => {
            console.error(err.message, err.stack);
        });
    }

    

});