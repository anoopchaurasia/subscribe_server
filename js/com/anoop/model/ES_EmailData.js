fm.Package('com.anoop.model')

fm.Class('ES_EmailData', function(me){
    'use strict';
    this.setMe=_me=>me=_me;
    Static.commonQuery = function ({ user, start_date, end_date }) {
        return {
            "bool": {
                "must": [
                    {
                        "match": {
                            "user_id": user._id
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
        };
    }

    Static.readcount = function (){
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
});