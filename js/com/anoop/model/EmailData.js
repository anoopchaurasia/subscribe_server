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
        // await bulkSave([set]);
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
        if (serving_array.length == 0) return
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
    Static.countDocument = async function({user}){
        console.log("got for count ",user)
        let response = await client.count({
            index:'emaildata',
            type :'emaildata',
            body:{
                "query" : {
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

    Static.getBySender = async function ({ start_date, end_date, user, offset, limit,next="" }) {
        console.log(offset,limit)
        // if(offset){
        //     for(let i=0;i<offset;i++){
        //         let resp = await client.search({
        //             index:'emaildata',
        //             type :'emaildata',
        //             body:{
        //                 "size": 0,
        //                 "query": {
        //                   "bool": {
        //                     "must": [
        //                       {
        //                         "match": {
        //                             "user_id.keyword": user._id
        //                         }
        //                       },
        //                       {
        //                         "range": {
        //                           "receivedDate": {
        //                             "gte": new Date(start_date),
        //                             "lte": new Date(end_date)
        //                           }
        //                         }
        //                       }
        //                     ],
        //                     "must_not": {
        //                         "exists": {
        //                             "field": "deleted_at"
        //                         }
        //                     }
        //                   }
        //                 },
        //                 "aggs": {
        //                   "my_buckets": {
        //                     "composite": {
        //                       "sources": [
        //                         {
        //                           "from_email": {
        //                             "terms": {
        //                               "field": "from_email.keyword"
        //                             }
        //                           }
        //                         }
        //                       ],
        //                       "size":20,
        //                       "after": {
        //                         "from_email": next
        //                       }
        //                     },
        //                     "aggs": {
        //                       "mySort": {
        //                         "bucket_sort": {
        //                           "sort": [
        //                             {
        //                               "_count": {
        //                                 "order": "desc"
        //                               }
        //                             }
        //                           ]
        //                         }
        //                       },
        //                       "from_email": {
        //                         "top_hits": {
        //                           "_source": {
        //                             "includes": [
        //                               "subject"
        //                             ]
        //                           },
        //                           "size":5
        //                         }
        //                       },
        //                       "size": {
        //                         "sum": {
        //                           "field": "size"
        //                         }
        //                       },
        //                       "readcount": {
        //                         "filter": {
        //                           "bool": {
        //                             "must": {
        //                               "term": {
        //                                 "status.keyword": "read"
        //                               }
        //                             }
        //                           }
        //                         }
        //                       }
        //                     }
        //                   }
        //                 }
        //             }
        //         })
        //         console.log(resp);
        //         let newEmails = resp.aggregations.my_buckets.buckets;
        //         if(newEmails.length!=0){
        //             next = resp.aggregations.my_buckets.after_key.from_email;
        //         }
        //     }
        // }
        let response = await client.search({
            index:'emaildata',
            type :'emaildata',
            body:{
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
                      "size":10000
                     
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
                          "size":5
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
        console.log(response)
        // let response = await client.search({
        //     index: 'emaildata',
        //     type: 'emaildata',
        //     body: {
        //         "from":offset,
        //         "size":limit,
        //         query: {
        //             "bool": {
        //                 "must": [
        //                     { "match": { "user_id.keyword": user._id } },
        //                     // { "match": { "deleted_at.keyword": null } },
        //                     {
        //                         "range": {
        //                             "receivedDate":
        //                             {
        //                                 "gte": new Date(start_date),
        //                                 "lte": new Date(end_date)
        //                             }
        //                         }
        //                     }
        //                 ]
        //             }
        //         },
        //         "aggs": {
        //             "top_tags": {
        //                 "terms": {
        //                     "field": "from_email.keyword",
        //                     "size": 10
        //                 },
        //                 "aggs": {
        //                     "from_email": {
        //                         "top_hits": {
        //                             "_source": {
        //                                 "includes": ["subject"]
        //                             }

        //                         }
        //                     },
        //                     "size": {
        //                         "sum": {
        //                             "field": "size"
        //                         }
        //                     },
        //                     "readcount": {
        //                         "filter": {
        //                             "bool": {
        //                                 "must": {
        //                                     "term": { "status.keyword": "read" }

        //                                 }
        //                             }
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // });
        // console.log(response);
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
                            // { "match": { "deleted_at.keyword": null } },
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
                            // { "match": { "deleted_at.keyword": null } },
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

    Static.getIdByBoxAndFromEmail = async function ({ start_date, end_date, user, from_emails, box_name,offset }) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from":offset,
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

    Static.getIdByBox = async function ({ start_date, end_date, user, box_name ,offset}) {
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from":offset,
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


    Static.getIdByLabelList = async function ({ start_date, end_date, user, box_name,offset }) {
        console.log("label name=>", box_name, start_date, end_date, user._id);
        let response = await client.search({
            index: 'emaildata',
            type: 'emaildata',
            body: {
                "_source": "email_id",
                "size": 5000,
                "from":offset,
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
        return updateQcDeleteBySender(start_date,end_date,user_id,from_emails);
    };

    Static.updateDeleteDbByLabel = async function ({ start_date, end_date, user_id, label_name }) {
        return updateQcDeleteByLabel(start_date,end_date,user_id,label_name);
    };

    Static.updateDeleteDbBySize = async function ({ start_date, end_date, user_id, size_group }) {
        return updateQcDeleteBySize(start_date,end_date,user_id,size_group);
    };

    async function updateQcDeleteBySender(start_date,end_date,user_id,from_emails) {
        console.log("here come for delete update")
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
        console.log("delete update response came====>",response);
        return response;
    }

    async function updateQcDeleteByLabel(start_date,end_date,user_id,box_name) {
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

    async function updateQcDeleteBySize(start_date,end_date,user_id,size_group) {
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


    async function updateQcDeleteCommon(match) {
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