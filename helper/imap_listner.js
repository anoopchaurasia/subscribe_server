'use strict'
process.on('uncaughtException', function (err) {
    console.error(err, "uncaughtException");
});
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

let LISTEN_USER_KEY = global.listner_key;

RedisDB.BLPopListner(LISTEN_USER_KEY, async function([key, user_id]){
    let user = await ImapController.getUserById(user_id);
    await scrapEmailForIamp(user).catch(err => {
        console.error(err.message, "user -> ", user.email);
    });
});
let listner_counter = 0, failed_counter=0, total_received=0;
async function scrapEmailForIamp(user){
    total_received++;
    console.log("here ->",user.email);
    await ImapController.updateUserById({_id: user._id}, {$set: {listener_active: true}} );
    listner_counter++;
    let user_hex_id = user._id.toHexString()
    RedisDB.base.setData(LISTEN_USER_KEY+"_"+process.env.pm_id, listner_counter);
    await ImapController.listenForUser(user, "start", function(x, y){
        console.log(x, "new email update", listner_counter, total_received, failed_counter, user.email);
        RedisDB.lPush("email_update_for_user", user_hex_id);
    }).catch(e=>{
        if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
            console.warn("user listener crashed restarting reason: ", e.message, user.email);
            setTimeout(x=>{
                RedisDB.lPush(LISTEN_USER_KEY, user_hex_id)
            }, 60*1000)
        }
        failed_counter++;
        listner_counter--;
        console.warn("removed user", user.email, listner_counter);
        RedisDB.base.setData("active_listner_for_"+process.env.pm_id, listner_counter);
    });
};



