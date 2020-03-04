fm.Package("com.anoop.model");
const mongo_emailInfo = require('../../../../models/emailInfo');

fm.Class("EmailInfo>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.getEmailIdsByEmailDetail = async function (emaildetail) {
        let emails = await mongo_emailInfo.find({ "from_email_id": emaildetail._id }, { "email_id": 1, _id: 0 }).exec();
        return emails.map(x => x.email_id);
    };

    let serving_array = [], update_save_timeout;
    Static.updateOrCreateAndGet = async function (query, set) {
        return ;
        // me.updateQueryValidation(query, "from_email_id");
        // clearTimeout(update_save_timeout);
        // serving_array.push([query, {$setOnInsert: set}]);
        // if (serving_array.length == 200) {
        //     await bulkSave(serving_array);
        //     serving_array = [];
        // }
        // update_save_timeout = setTimeout(async () => {
        //     await bulkSave(serving_array);
        //     serving_array = [];
        // }, 10000)
    };

    async function bulkSave(serving_array) {
        if (serving_array.length == 0) return
        let copy = [...serving_array];
        var bulk = mongo_emailInfo.collection.initializeOrderedBulkOp();
        copy.forEach(([query, set]) => {
            bulk.find(query).upsert().update(set);
        });
        await bulk.execute(function (error) {
            if (error) return console.error(error, "while saving emailinfo for user");
            console.log("saved emailinfo for user", copy.length);
        });
    }



    Static.updateEmailInfo = async function(query,set){
        me.updateQueryValidation(query, 'email_id');
        return await mongo_emailInfo.findOneAndUpdate(query, { $set: set }, {  upsert: true }).exec();
    }

    Static.fromEamil = async function (data, from_email_id, url) {
        let date_string =  data['header'] && data.header.date ?data.header.date.split('Date: ')[1]:data.receivedDateTime;
        return {
            from_email_id,
            email_id: data.email_id,
            historyId: data.historyId,
            unsubscribe: url,
            subject: data.subject,
            labelIds: data.labelIds,
            date: me.getDate(date_string, from_email_id)
        }
    };


    Static.getBulkCount = async function (emaildetail_ids, aggregatedat) {
        let steps = [];

        return await mongo_emailInfo.aggregate(aggregateQuery).exec();
    };
    
});