fm.Package("com.anoop.model");
const mongo_emaildata = require('../../../../models/emailsData');
var client = require('./../../../../elastic/connection.js');
fm.Import(".ES_EmailData")
fm.Class("EmailData>.BaseModel", function (me, ES_EmailData) {
    this.setMe = _me => me = _me;

    Static.get = async function (query) {
        me.updateQueryValidation(query);
        return await mongo_emaildata.findOne(query).exec();
    };


    Static.getAll = async function (query) {
        me.updateQueryValidation(query);
        return await mongo_emaildata.find(query).exec();
    };

    Static.getDistinct = async function () {
        return await mongo_emaildata.distinct('user_id',{"deleted_at" :{$exists: true}}).exec();
    };


    Static.getBoxWiseData = async function(user,date){
        return await mongo_emaildata.aggregate([{ $match: { "user_id": user._id ,'deleted_at':{$lte:date} }}, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "email_id": "$email_id",
                        "receivedDate":"$receivedDate"
                    }
                }
            }
        },
        { $project: {  data: 1 } }]).catch(err => {
            console.error(err.message, err.stack, "14eq");
        });
    }

    


    let serving_array = [], serving_array_db = [], update_save_timeout;
    Static.updateOrCreateAndGet = async function (query, set) {
        me.updateQueryValidation(query);
        clearTimeout(update_save_timeout);
        serving_array.push(set);
        serving_array_db.push([query, { $set: set }]);
        if (serving_array.length == 200) {
            let arr = [...serving_array];
            let arr_db = [...serving_array_db];
            serving_array = [];
            serving_array_db = [];
            await bulkSaveToDB(arr_db);
            await bulkSave(arr);
        }
        update_save_timeout = setTimeout(async () => {
            await bulkSaveToDB(serving_array_db);
            await bulkSave(serving_array);
            serving_array = [];
            serving_array_db = [];
        }, 10000)
    };

    Static.updateForDelete = async function (query, set) {
        me.updateQueryValidation(query);
        await mongo_emaildata.updateMany(query, { $set: set }).exec()
    };

    async function bulkSaveToDB(serving_array) {
        if (serving_array.length == 0) return
        var bulk = mongo_emaildata.collection.initializeOrderedBulkOp();
        serving_array.forEach(([query, set]) => {
            bulk.find(query).upsert().update(set);
        });
        await bulk.execute(function (error) {
            if (error) return console.error(error, "while saving emaildata for user");
            console.log("saved emaildata for user", serving_array.length);
        });
    }

    Static.bulkSave = bulkSave;
    async function bulkSave(serving_array) {
        if (serving_array.length == 0) return
        let bulkBody = [];
        serving_array.forEach(item => {
            bulkBody.push({
                index: {
                    _index: 'emaildata',
                    _id: item.user_id + item.email_id + item.box_name
                }
            });

            bulkBody.push(item);
        });
        console.log("indexing ", serving_array.length);
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

    Static.countDocument = async function ({ user }) {
        let response = await client.count({
            index: 'emaildata',
            type: '_doc',
            body: {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "user_id": user._id
                                }
                            }
                        ],
                        "must_not": {
                            "exists": {
                                "field": "deleted_at"
                            }
                        }
                    }
                }
            }
        });
        // console.log(response);
        return response.count;
    }


    Static.getBySender = async function ({ start_date, end_date, user, offset, limit }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "size": 0,
                "query": ES_EmailData.commonQuery({ start_date, end_date, user_id: user._id }),
                "aggs": {
                    "my_buckets": {
                        "composite": {
                            "sources": ES_EmailData.compositeAggregation(),
                            "size": 10000
                        },
                        "aggs": {
                            "mySort": ES_EmailData.bucketSort({ offset, limit }),
                            "from_email": {
                                "top_hits": ES_EmailData.topHits()
                            },
                            "size": ES_EmailData.sizeTotal(),
                            "readcount": ES_EmailData.readcount()
                        }
                    }
                }
            }
        });
        // console.log(response)
        return response;
    };


    Static.getByLabel = async function ({ start_date, end_date, user }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                query: ES_EmailData.commonQuery({ start_date, end_date, user_id: user._id }),
                "aggs": {
                    "top_tags": {
                        "terms": {
                            "field": "box_name",
                            "size": 100
                        },
                        "aggs": {
                            "box_name": {
                                "top_hits": ES_EmailData.topHits()
                            },
                            "size": ES_EmailData.sizeTotal(),
                            "readcount": ES_EmailData.readcount()
                        }
                    }
                }
            }
        });
        return response;
    };


    Static.getBySize = async function ({ start_date, end_date, user }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                query: ES_EmailData.commonQuery({ start_date, end_date, user_id: user._id }),
                "aggs": {
                    "top_tags": {
                        "terms": {
                            "field": "size_group",
                            "size": 100
                        },
                        "aggs": {
                            "size_group": {
                                "top_hits": ES_EmailData.topHits()
                            },
                            "size": ES_EmailData.sizeTotal(),
                            "readcount": ES_EmailData.readcount()
                        }
                    }
                }
            }
        });
        return response;
    };

    Static.getIdsBySize = async function ({ start_date, end_date, user, size_group }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "size_group": size_group
                                }
                            }
                        ],
                        "must": ES_EmailData.commonMatchQuery({ start_date, end_date, user_id: user._id })
                    }

                }, "aggregations": ES_EmailData.commonBoxnameAggregation()
            }
        });
        return response.aggregations.data.buckets;
    };

    Static.getIdsByLabelName = async function ({ start_date, end_date, user, label_name }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "box_name": label_name
                                }
                            }
                        ],
                        "must": ES_EmailData.commonMatchQuery({ start_date, end_date, user_id: user._id })
                    }

                }, "aggregations": ES_EmailData.commonBoxnameAggregation()
            }
        });
        return response.aggregations.data.buckets;
    };

    Static.getIdsByFromEmail = async function ({ start_date, end_date, user, from_emails }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "from_email": from_emails
                                }
                            }
                        ],
                        "must": ES_EmailData.commonMatchQuery({ start_date, end_date, user_id: user._id })
                    }
                }, "aggregations": ES_EmailData.commonBoxnameAggregation()
            }
        });
        return response.aggregations.data.buckets;
    };

    Static.getIdByBoxAndFromEmail = async function ({ start_date, end_date, user, from_emails, box_name, offset }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from": offset,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "from_email": from_emails
                                }
                            }
                        ],
                        "must": [
                            { "match": { "user_id": user._id } },
                            { "match": { "box_name": box_name } },
                            {
                                "range": {
                                    "receivedDate":
                                    {
                                        "gte": new Date(start_date),
                                        "lte": new Date(end_date)
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        });
        return response.hits.hits;
    }

    Static.getIdByBox = async function ({ start_date, end_date, user, box_name, offset }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from": offset,
                "query": ES_EmailData.commonBoxIdQuery({ start_date, end_date, box_name, user_id: user._id })
            }
        });
        return response.hits.hits;
    }


    Static.getIdByLabelList = async function ({ start_date, end_date, user, box_name, offset }) {
        let response = await client.search({
            index: 'emaildata',
            type: '_doc',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from": offset,
                "query": ES_EmailData.commonBoxIdQuery({ start_date, end_date, box_name, user_id: user._id })
            }
        });
        return response.hits.hits;
    }

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

    async function updateQcDeleteCommon(match) {
        console.log(match)
        try {
            return await mongo_emaildata.updateMany({
                ...match
            }, {
                $set: {
                    deleted_at: new Date
                }
            }
            ).exec();
        } catch (error) {
            console.log(error);
        }
    }

    Static.updateDeleteDbBySender = async function ({ start_date, end_date, user_id, from_emails }) {
        updateQcDeleteBySender(start_date, end_date, user_id, from_emails);
        let match = commonQueryForUpdate({ user_id, start_date, end_date });
        match.from_email = { $in: from_emails }
        return updateQcDeleteCommon(match);
    };

    Static.updateDeleteDbByLabel = async function ({ start_date, end_date, user_id, label_name }) {
        updateQcDeleteByLabel(start_date, end_date, user_id, label_name);
        let match = commonQueryForUpdate({ user_id, start_date, end_date });
        match.box_name = { $in: label_name };
        return updateQcDeleteCommon(match);
    };

    Static.updateDeleteDbBySize = async function ({ start_date, end_date, user_id, size_group }) {
        updateQcDeleteBySize(start_date, end_date, user_id, size_group);
        let match = commonQueryForUpdate({ user_id, start_date, end_date });
        match.size_group = { $in: size_group }
        return updateQcDeleteCommon(match);
    };

    async function updateQcDeleteBySender(start_date, end_date, user_id, from_emails) {
        let response = await client.updateByQuery(
            {
                index: "emaildata",
                type: "_doc",
                body: {
                    "query": {
                        "bool": {
                            "filter": [
                                {
                                    "terms": {
                                        "from_email": from_emails
                                    }
                                }
                            ],
                            "must": ES_EmailData.commonMatchQuery({ start_date, end_date, user_id })
                        }
                    },
                    "script": ES_EmailData.setDeleteScript()
                }
            });
        return response;
    }

    async function updateQcDeleteByLabel(start_date, end_date, user_id, box_name) {
        let response = await client.updateByQuery(
            {
                index: "emaildata", type: "_doc", body: {
                    "query": {
                        "bool": {
                            "filter": [
                                {
                                    "terms": {
                                        "box_name": box_name
                                    }
                                }
                            ],
                            "must": ES_EmailData.commonMatchQuery({ start_date, end_date, user_id })
                        }
                    },
                    "script": ES_EmailData.setDeleteScript()
                }
            });
        return response;
    }

    async function updateQcDeleteBySize(start_date, end_date, user_id, size_group) {
        let response = await client.updateByQuery(
            {
                index: "emaildata", type: "_doc", body: {
                    "query": {
                        "bool": {
                            "filter": [
                                {
                                    "terms": {
                                        "size_group": size_group
                                    }
                                }
                            ],
                            "must": ES_EmailData.commonMatchQuery({ start_date, end_date, user_id })
                        }
                    },
                    "script": ES_EmailData.setDeleteScript()
                }
            });
        return response;
    }

    Static.getCursor = async function (query, filter = {}, offset = 0) {
        return await mongo_emaildata.find(query, filter).skip(offset).lean().cursor()
    };


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