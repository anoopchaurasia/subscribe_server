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
        me.updateQueryValidation(query);
        await mongo_emaildata.updateMany(query, {$set: set}).exec()
    };

    async function bulkSave(serving_array) {
        if(serving_array.length==0) return
        var bulk = mongo_emaildata.collection.initializeOrderedBulkOp();
        serving_array.forEach(([query, set])=>{
            bulk.find(query).upsert().update(set);
        });
        await bulk.execute(function (error) {
            if(error) return console.error(error, "while saving emaildata for user");
            console.log("saved emaildata for user", serving_array.length);
        });
    }

    Static.getBySender = async function({start_date, end_date, user, offset, limit }){
        let match = {
            "user_id": user._id,
            is_delete: false,
        };
        if(start_date) {
            match.receivedDate = {$gte: new Date(start_date)}
        }
        if(end_date) {
            match.receivedDate = {$lte: new Date(end_date)}
        }
        return await mongo_emaildata.aggregate([{
                $match: {
                   ...match
                }
            }, {
                $group: {
                    _id: {
                        "from_email": "$from_email"
                    },
                    data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                        },
                    },
                    size: {
                        $sum: "$size"
                    },
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    "count": -1
                }
            },
            { $skip : offset },
            { $limit : limit },
            {
                "$project": {
                    'subject': {
                        "$slice": ["$data.subject", 5]
                    },
                    'labelIds': {
                        "$slice": ["$data.labelIds", 5]
                    }
                },
            },
        ])
    };


    Static.getIdsByFromEmail = async function({start_date, end_date, user, from_emails}){
        let match = {
            "user_id": user._id,
            is_delete: false,
            from_email: {
                $in: from_emails
            },
        };
        if(start_date) {
            match.receivedDate = {$gte: new Date(start_date)}
        }
        if(end_date) {
            match.receivedDate = {$lte: new Date(end_date)}
        }
        return await mongo_emaildata.aggregate([{
                $match: {
                    ...match
                }
            }, {
                $group: {
                    _id: "$box_name",
                    data: {
                        $push: {
                            "email_id": "$email_id"
                        }
                    }
                }
            }
        ]);
    };


    Static.storeEamil = function (emaildata, user_id) {
        return {
            user_id,
            from_email: emaildata.from_email,
            email_id: emaildata.email_id,
            subject: emaildata.subject,
            size: emaildata.size,
            receivedDate:  typeof emaildata.receivedDate==="string"? new Date(emaildata.receivedDate): emaildata.receivedDate,
            status:emaildata.status,
            labelIds:emaildata.labelIds,
            box_name:emaildata.box_name,
            size_group : emaildata.size_group,
            is_delete:false
        }
    }

});