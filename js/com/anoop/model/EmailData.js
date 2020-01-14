fm.Package("com.anoop.model");
const mongo_emaildata = require('../../../../models/emailsData');
var client = require('./../../../../elastic/connection.js');

fm.Class("EmailData>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query);
        return await mongo_emaildata.findOne(query).exec();
    };

    let serving_array = [], update_save_timeout;
    Static.updateOrCreateAndGet = async function (query, set) {
        me.updateQueryValidation(query);
        clearTimeout(update_save_timeout);
        serving_array.push(set);

        if (serving_array.length == 200) {
            let arr = [...serving_array];
            serving_array = [];
            await bulkSave(arr);
            serving_array = [];
        }
        update_save_timeout = setTimeout(async () => {
            await bulkSave(serving_array);
            serving_array = [];
        }, 10000)
    };

    Static.updateForDelete = async function (query, set) {
        me.updateQueryValidation(query);
        console.log(query, set)
        await mongo_emaildata.updateMany(query, { $set: set }).exec()
    };


 
    // async function bulkSave(serving_array) {

    //     if (serving_array.length == 0) return
    //     var bulk = mongo_emaildata.collection.initializeOrderedBulkOp();
    //     serving_array.forEach(([query, set]) => {
    //         bulk.find(query).upsert().update(set);
    //     });
    //     await bulk.execute(function (error) {
    //         if (error) return console.error(error, "while saving emaildata for user");
    //         console.log("saved emaildata for user", serving_array.length);
    //     });
    // }


    async function bulkSave(serving_array) {
        if(serving_array.length==0) return
        let bulkBody = [];
        serving_array.forEach(item => {
            bulkBody.push({
                index: {
                    _index: 'emaildata',
                    _type: 'emaildata',
                    _id: item.user_id + item.email_id + item.box_name
                }
            });

            bulkBody.push(item);
        });
        console.log("indexing ",serving_array.length);
        let response = await client.bulk({ body: bulkBody })
            
            .catch(console.err);
            let errorCount = 0;
                response.items.forEach(item => {
                    if (item.index && item.index.error) {
                        console.log(++errorCount, item.index.error);
                    }
                });
                console.log(
                    `Successfully indexed ${serving_array.length - errorCount}
         out of ${serving_array.length} items`)


    }



    function commonQuery({ user, start_date, end_date }) {
        let match = {
            "user_id": user._id,
            deleted_at: null,
        };
        if (start_date) {
            match.receivedDate = { $gte: new Date(start_date), $lte: new Date(end_date) }
        }
        return match;
    }

    Static.getBySender = async function ({ start_date, end_date, user, offset, limit }) {

        let response = await  client.search({  
            index: 'emaildata',
            type: 'emaildata',
            body: {
              query: {
                "bool": {
                    "must": [
                        {"match": {"user_id.keyword":user._id}},
                        {"range": {"receivedDate" :
                                   { "gte": new Date(start_date), 
                                    "lte": new Date(end_date)
                                   }}}
                    ]
             }
          },
            "aggs": {
                "top_tags": {
                    "terms": {
                        "field": "from_email.keyword",
                        "size": 10
                    },
                    "aggs": {
                        "from_email": {
                            "top_hits": {
                                "_source": {
                                    "includes": [ "subject" ]
                                }
        
                            }
                        },
                        "size" : {
                          "sum" : {
                            "field" : "size"
                          }
                      },
                      "readcount" : {
                        "filter":{
                           "bool": {
                          "must" :{
                            "term" : { "status.keyword" : "read" }
                          
                          }
                      }}
                      }
                    }
                }
            }
        }
        });
        console.log(response);
        // return response;
        // let match = commonQuery({ user, start_date, end_date });
        
        // console.log(start_date,end_date)
        // console.log(match)
        // return await mongo_emaildata.aggregate([{
        //     $match: {
        //         ...match
        //     }
        // }, {
        //     $group: {
        //         _id: {
        //             "from_email": "$from_email"
        //         },
        //         data: {
        //             $push: {
        //                 "subject": "$subject",
        //                 "status": "$status"
        //             },
        //         },
        //         size: {
        //             $sum: "$size"
        //         },
        //         count: {
        //             $sum: 1
        //         }
        //     }
        // },
        // {
        //     $sort: {
        //         "size": -1
        //     }
        // },
        // { $skip: offset },
        // { $limit: limit },
        // {
        //     "$project": {
        //         'subject': {
        //             "$slice": ["$data.subject", 5]
        //         },
        //         data: 1,
        //         size: 1,
        //         count: 1
        //     },
        // },
        // ])
    };


    Static.getByLabel = async function ({ start_date, end_date, user }) {
        // let match = commonQuery({ user, start_date, end_date });
        // return await mongo_emaildata.aggregate([{
        //     $match: {
        //         ...match
        //     }
        // }, {
        //     $group: {
        //         _id: {
        //             "box_name": "$box_name"
        //         },
        //         data: {
        //             $push: {
        //                 "subject": "$subject",
        //                 "status": "$status"
        //             },
        //         },
        //         size: {
        //             $sum: "$size"
        //         },
        //         count: {
        //             $sum: 1
        //         }
        //     }
        // },
        // {
        //     $sort: {
        //         "count": -1
        //     }
        // },
        // {
        //     "$project": {
        //         'subject': {
        //             "$slice": ["$data.subject", 5]
        //         },
        //         data: 1,
        //         size: 1,
        //         count: 1
        //     },
        // },
        // ])
        let response = await  client.search({  
            index: 'emaildata',
            type: 'emaildata',
            body: {
              query: {
                "bool": {
                    "must": [
                        {"match": {"user_id.keyword":user._id}},
                        {"range": {"receivedDate" :
                                   { "gte": new Date(start_date), 
                                    "lte": new Date(end_date)
                                   }}}
                    ]
             }
          },
            "aggs": {
                "top_tags": {
                    "terms": {
                        "field": "box_name.keyword",
                        "size": 10
                    },
                    "aggs": {
                        "box_name": {
                            "top_hits": {
                                "_source": {
                                    "includes": [ "subject" ]
                                }
        
                            }
                        },
                        "size" : {
                          "sum" : {
                            "field" : "size"
                          }
                      },
                      "readcount" : {
                        "filter":{
                           "bool": {
                          "must" :{
                            "term" : { "status.keyword" : "read" }
                          
                          }
                      }}
                      }
                    }
                }
            }
        }
        });
        console.log(response);
        return response;
    };


    Static.getBySize = async function ({ start_date, end_date, user }) {
        // let match = commonQuery({ user, start_date, end_date });
        // return await mongo_emaildata.aggregate([{
        //     $match: {
        //         ...match
        //     }
        // }, {
        //     $group: {
        //         _id: {
        //             "size_group": "$size_group"
        //         },
        //         data: {
        //             $push: {
        //                 "subject": "$subject",
        //                 "status": "$status"
        //             },
        //         },
        //         size: {
        //             $sum: "$size"
        //         },
        //         count: {
        //             $sum: 1
        //         }
        //     }
        // },
        // {
        //     $sort: {
        //         "count": -1
        //     }
        // },
        // {
        //     "$project": {
        //         'subject': {
        //             "$slice": ["$data.subject", 5]
        //         },
        //         data: 1,
        //         size: 1,
        //         count: 1
        //     },
        // },
        // ])
        let response = await  client.search({  
            index: 'emaildata',
            type: 'emaildata',
            body: {
              query: {
                "bool": {
                    "must": [
                        {"match": {"user_id.keyword":user._id}},
                        {"range": {"receivedDate" :
                                   { "gte": new Date(start_date), 
                                    "lte": new Date(end_date)
                                   }}}
                    ]
             }
          },
            "aggs": {
                "top_tags": {
                    "terms": {
                        "field": "size_group",
                        "size": 10
                    },
                    "aggs": {
                        "size_group": {
                            "top_hits": {
                                "_source": {
                                    "includes": [ "subject" ]
                                }
        
                            }
                        },
                        "size" : {
                          "sum" : {
                            "field" : "size"
                          }
                      },
                      "readcount" : {
                        "filter":{
                           "bool": {
                          "must" :{
                            "term" : { "status.keyword" : "read" }
                          
                          }
                      }}
                      }
                    }
                }
            }
        }
        });
        console.log(response);
        return response;
    };

    async function getIdsCommon(match) {
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
    }



    function commonQueryForDelete({ user, start_date, end_date }) {
        let match = {
            "user_id": user._id,
        };
        if (start_date) {
            match.receivedDate = { $gte: new Date(start_date), $lte: new Date(end_date) }
        }
        return match;
    }

    Static.getIdsBySize = async function ({ start_date, end_date, user, size_group }) {
        let match = commonQueryForDelete({ user, start_date, end_date });
        match.size_group = { $in: size_group }
        return await getIdsCommon(match)
    };

    Static.getIdsByLabelName = async function ({ start_date, end_date, user, label_name }) {
        let match = commonQueryForDelete({ user, start_date, end_date });
        match.box_name = { $in: label_name };
        return await getIdsCommon(match);
    };


    Static.getIdsByFromEmail = async function ({ start_date, end_date, user, from_emails }) {
        let match = commonQueryForDelete({ user, start_date, end_date });
        match.from_email = { $in: from_emails }
        return getIdsCommon(match);
    };



    function commonQueryForUpdate({ user_id, start_date, end_date }) {
        let match = {
            "user_id": user_id,
            deleted_at: null,
        };
        if (start_date) {
            match.receivedDate = { $gte: new Date(start_date), $lte: new Date(end_date) }
        }
        return match;
    }


    Static.updateDeleteDbBySender = async function ({ start_date, end_date, user_id, from_emails }) {
        let match = commonQueryForUpdate({ user_id, start_date, end_date });
        match.from_email = { $in: from_emails }
        return updateQcDeleteCommon(match);
    };

    Static.updateDeleteDbByLabel = async function ({ start_date, end_date, user_id, label_name }) {
        let match = commonQueryForUpdate({ user_id, start_date, end_date });
        match.box_name = { $in: label_name };
        return updateQcDeleteCommon(match);
    };

    Static.updateDeleteDbBySize = async function ({ start_date, end_date, user_id, size_group }) {
        let match = commonQueryForUpdate({ user_id, start_date, end_date });
        match.size_group = { $in: size_group }
        return updateQcDeleteCommon(match);
    };


    async function updateQcDeleteCommon(match) {
        // console.log("here find");
        // console.log(match)
        try {
            return await mongo_emaildata.updateMany({
                ...match
            }, {
                $set: {
                    deleted_at: new Date
                }
            }
            ).exec();
            // console.log(ot)
        } catch (error) {
            console.log(error);
        }

    }


    Static.storeEamil = function (emaildata, user_id) {
        return {
            user_id,
            from_email: emaildata.from_email,
            email_id: emaildata.email_id + "",
            subject: emaildata.subject,
            size: emaildata.size,
            receivedDate: typeof emaildata.receivedDate === "string" ? new Date(emaildata.receivedDate) : emaildata.receivedDate,
            status: emaildata.status,
            labelIds: emaildata.labelIds,
            box_name: emaildata.box_name,
            size_group: emaildata.size_group,
            deleted_at: null
        }
    }

});