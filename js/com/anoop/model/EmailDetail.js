fm.Package("com.anoop.model");
const mongo_emaildetail = require('../../../../models/emailDetails');
fm.Class("EmailDetail>.BaseModel", function (me) {
    this.setMe = _me => me = _me;
    console.log("emaildetesdsdsdsdsd");
    Static.executeAggregateQuery = async function (query) {
        return await mongo_emaildetail.aggregate(query);
    }

    Static.get = async function (query) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOne(query).exec();
    };

    Static.updateStatus = async function (query, status) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOneAndUpdate(query, { $set: { status } }).exec().catch(err=>{
            console.error(err, "Static.updateStatus", query);
        });
    };

    Static.updateManyStatus = async function (query, status) {
        me.updateQueryValidation(query);
        console.log("update many status", JSON.stringify(query), status);
        return await mongo_emaildetail.updateMany(query, { $set: { status } }).exec().catch(err=>{
            console.error(err, "Static.updateManyStatus", query);
        });
    };

    Static.updateOrCreateAndGet = async function (query, set) {
        me.updateQueryValidation(query);
        if (!set.status) {
            set.status = "unused";
            console.error("no status provided")
        }
        return await mongo_emaildetail.findOneAndUpdate(query, { $set: set }, { new: true, upsert: true }).exec().catch(err=>{
            console.error(err, "Static.updateOrCreateAndGet", query);
        });
    };

    Static.getIfExist = async function (query) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.findOne(query).lean().exec();
    };

    Static.getByQuery = async function(query, projection={}, {offset, limit}={}) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.find(query, projection).skip(offset).limit(limit).lean().exec();
    };

    Static.getCountByQuery = async function(query) {
        me.updateQueryValidation(query);
        return await mongo_emaildetail.countDocuments(query).exec();
    };

    Static.getMultiple = async function (query, filter) {
        me.updateQueryValidation(query, filter);
        return await mongo_emaildetail.find(query).exec();
    };

    Static.isEmailMovable = async function (from_email) {
        let totalMoved = await mongo_emaildetail.estimatedDocumentCount({ "from_email": from_email, "status": { $in: ["move", "trash"] } })
        let totalKept = await mongo_emaildetail.estimatedDocumentCount({ "from_email": from_email, "status": "keep" })
        let percentMoved = totalMoved * 100 / ((totalKept + totalMoved) || 1);
        if (percentMoved >= 50) {
            return true;
        }
        return false;
    };

    Static.fromEamil = function (emaildata, user_id) {
        return {
            user_id,
            labelIds: emaildata.labelIds,
            from_email: emaildata.from_email,
            from_email_name: emaildata.from_email_name,
            to_email: emaildata.to_email,
            status: "unused",
            status_date: new Date,
            source: emaildata['source'] ? emaildata.source : ""
        }
    }

    Static.findBySource = async function (user) {
        return await mongo_emaildetail.find({ source: "manual", user_id: user._id },{_id:0,to_email:0,status_date:0,source:0,user_id:0,main_label:0,labelIds:0}).exec();
    }

    Static.storeEamil = function (emaildata, user_id) {
        return {
            user_id,
            labelIds: [],
            from_email: emaildata.from_email,
            from_email_name: emaildata.from_email,
            to_email: null,
            status: emaildata.status,
            status_date: new Date,
            source: "manual"
        }
    }

});