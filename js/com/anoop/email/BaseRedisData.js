fm.Package('com.anoop.email')
let redis = require("redis");
fm.Import("..model.Domain");
fm.Class('BaseRedisData', function(me, Domain){
    'use strict';
    this.setMe=_me=>me=_me;
    let redis_client;
    Static.main = function(){
        redis_client = redis.createClient({
            host: process.env.REDIS_HOST
        })
    }
    Static.getAllDomain = async function () {
        return await Domain.get();
    }
    Static.sendMailToScraper = async function(data, user, source="imap_server"){
        if (Domain.match(data.from)) {
            data.company = "imap";
            data.user_id = ("0x" + `${user._id}`.slice(-8)) * 1 + 1000000000000;
            data.source = data.source || "imap_server";
            redis_client.lpush('raw_email_data', JSON.stringify(data));
        }
    };
});