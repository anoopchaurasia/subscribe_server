fm.Package('com.anoop.email')
let redis = require("redis");
let redis_client = redis.createClient({
    host: process.env.REDIS_HOST,
    no_ready_check: true,
    auth_pass: process.env.REDIS_PASSWORD,
})

fm.Import("..model.Domain");
fm.Class('BaseRedisData', function(me, Domain){
    'use strict';
    this.setMe=_me=>me=_me;
    
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

    Static.notifyListner = async function (user_id) {
        redis_client.lpush('new_imap_user', user_id);
        redis_client.expire("new_imap_user", 20);
    };

    Static.onNewUser = function(cb){
        function next () {
            redis_client.blpop('new_imap_user', 0, function(err, [key, user_id]){
                try{
                   cb(user_id);
                } catch(e){
                    console.log(e);
                } finally {
                    next();
                }
            });
        }
        next();
    };
});