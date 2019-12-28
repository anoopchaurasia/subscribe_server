fm.Package("com.anoop.model");
const mongo_emaildata = require('../../../../models/emailsData');
fm.Class("EmailData>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(query){
        me.updateQueryValidation(query);
        return await mongo_emaildata.findOne(query).exec();
    };

    let serving_array = [], update_save_timeout;
    Static.updateOrCreateAndGet = async function(query, set) {
        me.updateQueryValidation(query);
        clearTimeout(update_save_timeout);
        serving_array.push([query, {$set:set}]);
        if(serving_array.length==200) {
            await bulkSave(serving_array);
            serving_array = [];
        }
        update_save_timeout = setTimeout(async ()=>{
            await bulkSave(serving_array);
            serving_array = [];
        }, 10000)
    };
    
    Static.updateForDelete = async function (query, set) {
        clearTimeout(update_save_timeout);
        me.updateQueryValidation(query);
        serving_array.push([query, {$set:set}]);
        if(serving_array.length==200) {
            bulkSave(serving_array);
            serving_array = [];
        }
        update_save_timeout = setTimeout(()=>{
            bulkSave(serving_array);
            serving_array = [];
        }, 10000)
    };

    async function bulkSave(serving_array) {
        var bulk = mongo_emaildata.collection.initializeOrderedBulkOp();
        serving_array.forEach(([query, set])=>{
            bulk.find(query).upsert().update(set);
        });
        await bulk.execute(function (error) {
            if(error) return console.error(error, "while saving emaildata for user");
            console.log("saved emaildata for user", serving_array.length);
        });
    }


    Static.storeEamil = function (emaildata, user_id) {
        return {
            user_id,
            from_email: emaildata.from_email,
            email_id: emaildata.email_id,
            subject: emaildata.subject,
            size: emaildata.size,
            receivedDate: emaildata.receivedDate,
            status:emaildata.status,
            labelIds:emaildata.labelIds,
            box_name:emaildata.box_name,
            size_group : emaildata.size_group,
            is_delete:false
        }
    }

});