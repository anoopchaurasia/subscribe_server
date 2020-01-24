fm.Package('com.anoop.model');
fm.Class('ES_EmailData', function (me) {
    'use strict';
    this.setMe = _me => me = _me;
    Static.commonQuery = function ({ start_date, end_date, user_id }) {
        return {
            "bool": {
                "must": [
                    {
                        "match": {
                            "user_id": user_id
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
                "must_not": [
                    {
                    "exists": {
                        "field": "deleted_at"
                    }
                }, {
                    "term": {
                        "box_name": "[Gmail]/Trash"
                    }
                },
                {
                    "term": {
                        "box_name": "[Gmail]/Bin"
                    }
                }]
            }
        };
    }

    Static.readcount = function () {
        return {
            "filter": {
                "bool": {
                    "must": {
                        "term": { "status": "read" }

                    }
                }
            }
        }
    }

    Static.topHits = function () {
        return {
            "_source": {
                "includes": [
                    "subject"
                ]
            },
            "size": 5
        }
    }


    Static.commonMatchQuery = function ({ start_date, end_date, user_id }) {
        return [
            { "match": { "user_id": user_id } },
            {
                "range": {
                    "receivedDate":
                    {
                        "gte": new Date(start_date),
                        "lte": new Date(end_date)
                    }
                }
            }
        ];
    }


    Static.commonBoxnameAggregation = function () {
        return {
            "data": {
                "terms": {
                    "field": "box_name"
                }
            }
        }
    }

    Static.commonBoxIdQuery = function ({ start_date, end_date, box_name, user_id }) {
        return {
            "bool": {
                "must": [
                    { "match": { "user_id": user_id } },
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

    Static.bucketSort = function ({ offset, limit }) {
        return {
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
        }
    }

    Static.compositeAggregation = function () {
        return [
            {
                "from_email": {
                    "terms": {
                        "field": "from_email"
                    }
                }
            }
        ];
    }

    Static.sizeTotal = function () {
        return {
            "sum": {
                "field": "size"
            }
        };
    }

    Static.setDeleteScript = function () {
        return {
            "source": "ctx._source.deleted_at=params.newValue",
            lang: 'painless',
            params: {
                newValue: new Date()
            }
        }
    }

});