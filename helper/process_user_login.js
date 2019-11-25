let redis = require("redis");
let redis_client =  redis.createClient({host: process.PROCESS_REDIS_HOST, port: process.env.PROCESS_REDIS_PORT });
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
async function next() {
    redis_client.blpop('process_user_login', 0, async function(err, data ){
        if(err) return console.error(err);
        let [key, user_id] = data;
        console.log("user_id", user_id);
        await ImapController.updateForUser(user_id);
        next();
    });
}
next();