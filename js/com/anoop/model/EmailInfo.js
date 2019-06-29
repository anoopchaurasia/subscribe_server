fm.Package("com.anoop.model");
const mongo_emailInfo = require('../../../../models/emailInfo');

fm.Class("EmailInfo>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.getEmailIdsByEmailDetail = async function(emaildetail){
        let emails = await mongo_emailInfo.find({ "from_email_id": emaildetail._id }, { "email_id": 1, _id: 0 });
        return emails.map(x=>x.email_id);
    };

    Static.updateOrCreateAndGet = async function(query, set) {
        me.updateQueryValidation(query, 'from_email_id');
        return await mongo_emailInfo.findOneAndUpdate(query, {$setOnInsert: set}, {new: true, upsert: true});
    };


    Static.fromEamil = async function(data, from_email_id, url) {
        // console.log(data)
        return {
            from_email_id,
            email_id: data.email_id,
            historyId: data.historyId,
            unsubscribe: url,
            subject: data.subject,
            labelIds: data.labelIds
        }
    };

    Static.bulkInsert = async function(bulkdata){
        var bulk = mongo_emailInfo.initializeUnorderedBulkOp();
        //bulkdata
    };

    Static.getBulkCount = async function(emaildetail_ids, aggregatedat) {
        let steps = [];

        return await mongo_emailInfo.aggregate(aggregateQuery).exec();
    };
});