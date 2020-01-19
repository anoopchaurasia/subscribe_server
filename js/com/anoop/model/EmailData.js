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
        }
        update_save_timeout = setTimeout(async () => {
            await bulkSave(serving_array);
            serving_array = [];
        }, 10000)
    };

    Static.updateForDelete = async function (query, set) {
        me.updateQueryValidation(query);
        await mongo_emaildata.updateMany(query, { $set: set }).exec()
    };

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
        console.log("got for count ", user)
        let response = await client.count({
            index: 'emaildata',
            type: 'emaildata',
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
        console.log(response);
        return response.count;
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

    Static.getBySender = async function ({ start_date, end_date, user, offset, limit, next = "" }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "user_id.keyword": user._id
                                }
                            },
                            {
                                "range": {
                                    "receivedDate": {
                                        "gte": new Date(start_date),
                                        "lte": new Date(end_date)
                                    }
                                }
                            }
                        ],
                        "must_not": {
                            "exists": {
                                "field": "deleted_at"
                            }
                        }
                    }
                },
                "aggs": {
                    "my_buckets": {
                        "composite": {
                            "sources": [
                                {
                                    "from_email": {
                                        "terms": {
                                            "field": "from_email.keyword"
                                        }
                                    }
                                }
                            ],
                            "size": 10000

                        },
                        "aggs": {
                            "mySort": {
                                "bucket_sort": {
                                    "sort": [
                                        {
                                            "_count": {
                                                "order": "desc"
                                            }
                                        }
                                    ],
                                    "from": offset,
                                    "size": limit
                                }
                            },
                            "from_email": {
                                "top_hits": {
                                    "_source": {
                                        "includes": [
                                            "subject"
                                        ]
                                    },
                                    "size": 5
                                }
                            },
                            "size": {
                                "sum": {
                                    "field": "size"
                                }
                            },
                            "readcount": {
                                "filter": {
                                    "bool": {
                                        "must": {
                                            "term": {
                                                "status.keyword": "read"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return response;
    };


    Static.getByLabel = async function ({ start_date, end_date, user }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                query: {
                    "bool": {
                        "must": [
                            { "match": { "user_id.keyword": user._id } },
                            {
                                "range": {
                                    "receivedDate":
                                    {
                                        "gte": new Date(start_date),
                                        "lte": new Date(end_date)
                                    }
                                }
                            }
                        ],
                        "must_not": {
                            "exists": {
                                "field": "deleted_at"
                            }
                        }
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
                                        "includes": ["subject"]
                                    }

                                }
                            },
                            "size": {
                                "sum": {
                                    "field": "size"
                                }
                            },
                            "readcount": {
                                "filter": {
                                    "bool": {
                                        "must": {
                                            "term": { "status.keyword": "read" }

                                        }
                                    }
                                }
                            }
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
            type: 'emaildata',
            body: {
                query: {
                    "bool": {
                        "must": [
                            { "match": { "user_id.keyword": user._id } },
                            {
                                "range": {
                                    "receivedDate":
                                    {
                                        "gte": new Date(start_date),
                                        "lte": new Date(end_date)
                                    }
                                }
                            }
                        ],
                        "must_not": {
                            "exists": {
                                "field": "deleted_at"
                            }
                        }
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
                                        "includes": ["subject"]
                                    }

                                }
                            },
                            "size": {
                                "sum": {
                                    "field": "size"
                                }
                            },
                            "readcount": {
                                "filter": {
                                    "bool": {
                                        "must": {
                                            "term": { "status.keyword": "read" }

                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        console.log(response);
        return response;
    };

    Static.getIdsBySize = async function ({ start_date, end_date, user, size_group }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
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
                        "must": [
                            { "match": { "user_id.keyword": user._id } },

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

                }, "aggregations": {
                    "data": {
                        "terms": {
                            "field": "box_name.keyword"
                        }
                    }

                }
            }
        });
        return response.aggregations.data.buckets;
    };

    Static.getIdsByLabelName = async function ({ start_date, end_date, user, label_name }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "box_name.keyword": label_name
                                }
                            }
                        ],
                        "must": [
                            { "match": { "user_id.keyword": user._id } },

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

                }, "aggregations": {
                    "data": {
                        "terms": {
                            "field": "box_name.keyword"
                        }
                    }

                }
            }
        });
        return response.aggregations.data.buckets;
    };

    Static.getIdsByFromEmail = async function ({ start_date, end_date, user, from_emails }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "from_email.keyword": from_emails
                                }
                            }
                        ],
                        "must": [
                            { "match": { "user_id.keyword": user._id } },
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
                }, "aggregations": {
                    "data": {
                        "terms": {
                            "field": "box_name.keyword"
                        }
                    }

                }
            }
        });
        return response.aggregations.data.buckets;
    };

    Static.getIdByBoxAndFromEmail = async function ({ start_date, end_date, user, from_emails, box_name, offset }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from": offset,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "terms": {
                                    "from_email.keyword": from_emails
                                }
                            }
                        ],
                        "must": [
                            { "match": { "user_id.keyword": user._id } },
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
            type: 'emaildata',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from": offset,
                "query": {
                    "bool": {
                        "must": [
                            { "match": { "user_id.keyword": user._id } },
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


    Static.getIdByLabelList = async function ({ start_date, end_date, user, box_name, offset }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from": offset,
                "query": {
                    "bool": {
                        "must": [
                            { "match": { "user_id.keyword": user._id } },
                            { "match": { "box_name.keyword": box_name } },
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



    Static.updateDeleteDbBySender = async function ({ start_date, end_date, user_id, from_emails }) {
        return updateQcDeleteBySender(start_date, end_date, user_id, from_emails);
    };

    Static.updateDeleteDbByLabel = async function ({ start_date, end_date, user_id, label_name }) {
        return updateQcDeleteByLabel(start_date, end_date, user_id, label_name);
    };

    Static.updateDeleteDbBySize = async function ({ start_date, end_date, user_id, size_group }) {
        return updateQcDeleteBySize(start_date, end_date, user_id, size_group);
    };

    async function updateQcDeleteBySender(start_date, end_date, user_id, from_emails) {
        let response = await client.updateByQuery(
            {
                index: "emaildata",
                type: "emaildata",
                body: {
                    "query": {
                        "bool": {
                            "filter": [
                                {
                                    "terms": {
                                        "from_email.keyword": from_emails
                                    }
                                }
                            ],
                            "must": [
                                {
                                    "match": {
                                        "user_id.keyword": user_id
                                    }
                                },
                                {
                                    "range": {
                                        "receivedDate": {
                                            "gte": new Date(start_date),
                                            "lte": new Date(end_date)
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "script": {
                        "source": "ctx._source.deleted_at=params.newValue",
                        lang: 'painless',
                        params: {
                            newValue: new Date()
                        }
                    }
                }
            });
        console.log("delete update response came====>", response);
        return response;
    }

    async function updateQcDeleteByLabel(start_date, end_date, user_id, box_name) {
        let response = await client.updateByQuery(
            {
                index: "emaildata", type: "emaildata", body: {
                    "query": {
                        "bool": {
                            "filter": [
                                {
                                    "terms": {
                                        "box_name.keyword": box_name
                                    }
                                }
                            ],
                            "must": [
                                {
                                    "match": {
                                        "user_id.keyword": user_id
                                    }
                                },
                                {
                                    "range": {
                                        "receivedDate": {
                                            "gte": new Date(start_date),
                                            "lte": new Date(end_date)
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "script": {
                        "source": "ctx._source.deleted_at=params.newValue",
                        lang: 'painless',
                        params: {
                            newValue: new Date()
                        }
                    }
                }
            });
        console.log(response);
        return response;
    }

    async function updateQcDeleteBySize(start_date, end_date, user_id, size_group) {
        let response = await client.updateByQuery(
            {
                index: "emaildata", type: "emaildata", body: {
                    "query": {
                        "bool": {
                            "filter": [
                                {
                                    "terms": {
                                        "size_group": size_group
                                    }
                                }
                            ],
                            "must": [
                                {
                                    "match": {
                                        "user_id.keyword": user_id
                                    }
                                },
                                {
                                    "range": {
                                        "receivedDate": {
                                            "gte": new Date(start_date),
                                            "lte": new Date(end_date)
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "script": {
                        "source": "ctx._source.deleted_at=params.newValue",
                        lang: 'painless',
                        params: {
                            newValue: new Date()
                        }
                    }
                }
            });
        console.log(response);
        return response;
    }

    Static.getCursor = async function(query, filter={}, offset=0){
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