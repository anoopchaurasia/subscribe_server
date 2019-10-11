fm.Package("com.anoop.model");
const mongo_emailInfo = require('../../../../models/emailInfo');

fm.Class("EmailInfo>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.getEmailIdsByEmailDetail = async function (emaildetail) {
        let emails = await mongo_emailInfo.find({ "from_email_id": emaildetail._id }, { "email_id": 1, _id: 0 });
        return emails.map(x => x.email_id);
    };

    Static.updateOrCreateAndGet = async function (query, set) {
        me.updateQueryValidation(query, 'from_email_id');
        return await mongo_emailInfo.findOneAndUpdate(query, { $setOnInsert: set }, { new: true, upsert: true });
    };

    Static.updateEmailInfo = async function(query,set){
        me.updateQueryValidation(query, 'email_id');
        return await mongo_emailInfo.findOneAndUpdate(query, { $set: set }, {  upsert: true });
    }

    Static.fromEamil = async function (data, from_email_id, url) {
        console.log("data-------:"+Object.keys(data));
        
        return {
            from_email_id,
            email_id: data.email_id,
            historyId: data.historyId,
            unsubscribe: url,
            subject: data.subject,
            labelIds: data.labelIds,
            date: data['header']?data.header.date.split('Date: ')[1]:data.receivedDateTime,
            size:data.size
        }
    };

    Static.bulkInsert = async function (bulkdata, from_email_id) {
        var bulk = mongo_emailInfo.collection.initializeUnorderedBulkOp();
        await bulkdata.asynForEach(async emailInfo => {
            emailInfo = JSON.parse(emailInfo);
            let emailInfoNew = await me.fromEamil(emailInfo, from_email_id, "");
            try {
                bulk.find({ "email_id": emailInfo.email_id }).upsert().update({ $set: emailInfoNew });
            } catch (err) {
                console.error(err.message, err.stack, "65");
            }
        });
        if (bulk.length > 0) {
            bulk.execute(function (err, result) {
                if (err) {
                    console.error(err, "66")
                }
            })
        }
    };

    Static.getBulkCount = async function (emaildetail_ids, aggregatedat) {
        let steps = [];

        return await mongo_emailInfo.aggregate(aggregateQuery).exec();
    };
    
});