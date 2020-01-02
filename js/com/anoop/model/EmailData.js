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
        console.log(query, set)
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

    function commonQuery({user, start_date, end_date}) {
        let match = {
            "user_id": user._id,
            deleted_at: null,
        };
        if(start_date) {
            match.receivedDate = {$gte: new Date(start_date), $lte: new Date(end_date)}
        }
        return match;
    }

    Static.getBySender = async function({start_date, end_date, user, offset, limit }){

        let match = commonQuery({user, start_date, end_date});
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
                            "subject": "$subject",
                            "status":"$status"
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
                    data:1,
                    size: 1,
                    count:1
                },
            },
        ])
    };


    Static.getByLabel = async function({start_date, end_date, user }){
        let match = commonQuery({user, start_date, end_date});
        return await mongo_emaildata.aggregate([{
                $match: {
                   ...match
                }
            }, {
                $group: {
                    _id: {
                        "box_name": "$box_name"
                    },
                    data: {
                        $push: {
                            "subject": "$subject",
                            "status":"$status"
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
            {
                "$project": {
                    'subject': {
                        "$slice": ["$data.subject", 5]
                    },
                    data:1,
                    size: 1,
                    count:1
                },
            },
        ])
    };


    Static.getBySize = async function({start_date, end_date, user }){
        let match = commonQuery({user, start_date, end_date});
        return await mongo_emaildata.aggregate([{
                $match: {
                   ...match
                }
            }, {
                $group: {
                    _id: {
                        "size_group": "$size_group"
                    },
                    data: {
                        $push: {
                            "subject": "$subject",
                            "status":"$status"
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
            {
                "$project": {
                    'subject': {
                        "$slice": ["$data.subject", 5]
                    },
                    data:1,
                    size: 1,
                    count:1
                },
            },
        ])
    };

    Static.getIdsBySize = async function({start_date, end_date, user, size_group}){
        let match = commonQuery({user, start_date, end_date});
        match.size_group = {$in: size_group}
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

    Static.getIdsByLabelName = async function({start_date, end_date, user, label_name}){
        let match = commonQuery({user, start_date, end_date});
        match. box_name = {$in:  label_name};
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


    Static.getIdsByFromEmail = async function({start_date, end_date, user, from_emails}){
        let match = commonQuery({user, start_date, end_date});
        match.from_email= { $in: from_emails }
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
            email_id: emaildata.email_id+"",
            subject: emaildata.subject,
            size: emaildata.size,
            receivedDate:  typeof emaildata.receivedDate==="string"? new Date(emaildata.receivedDate): emaildata.receivedDate,
            status:emaildata.status,
            labelIds:emaildata.labelIds,
            box_name:emaildata.box_name,
            size_group : emaildata.size_group,
            deleted_at: null
        }
    }

});