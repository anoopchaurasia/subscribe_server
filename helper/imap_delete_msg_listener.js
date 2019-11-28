'use strict'
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

let LISTEN_USER_KEY = "listen_for_user_delete_msg";


RedisDB.BLPopListner(LISTEN_USER_KEY, async function([key, user_id]){
    let user = await ImapController.getUserById(user_id);
    await scrapEmailForIamp(user).catch(err => {
        console.error(err.message, "user -> ", user.email);
    });
});
async function scrapEmailForIamp(user){
    console.log("here ->",user.email);
    await ImapController.deletePreviousMsg(user);
};



