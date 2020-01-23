fm.Package('com.anoop.email')
let redis = require("redis");
let redis_client = redis.createClient({
    host: process.env.REDIS_HOST,
    no_ready_check: true,
})

fm.Import("..model.Domain");
fm.Class('BaseRedisData', function(me, Domain){
    'use strict';
    this.setMe=_me=>me=_me;
    
    Static.getAllDomain = async function () {
        return await Domain.get();
    };


    Static.sendMailToScraper = async function(data, user, getBody,is_get_body){
        if (Domain.match(data.from)) {
            if(is_get_body===false) {
               return await getBody(data);
            }
            console.log("got_domain",data.from)
            data.company = "imap";
            data.user_id = ("0x" + `${user._id}`.slice(-8)) * 1 + 1000000000000;
            data.source = data.source || "imap_server";
            redis_client.lpush('raw_email_data', JSON.stringify(data));
            return true;
        }
        return false;
    };
});