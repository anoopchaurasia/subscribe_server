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
    await ImapController.updateUserById({_id: user._id}, {listener_active: true});
    await ImapController.listenForUserDeleteMsg(user, "start", function(x, y){
        console.log(x, y, "new email update");
        RedisDB.lPush("delete_msg_for_user", user._id.toHexString() );
    });
};



