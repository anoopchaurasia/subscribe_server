'use strict'
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

let LISTEN_USER_KEY = "listen_for_user";


RedisDB.BLPopListner(LISTEN_USER_KEY, async function([key, user_id]){
    let user = await ImapController.getUserById(user_id);
    if(user.inactive_at != null) {
        console.warn(user.email, "not active", "not setting listener");
    }
    await scrapEmailForIamp(user).catch(err => {
        console.error(err.message, "user -> ", user.email);
    });
});
async function scrapEmailForIamp(user){
    console.log("here ->",user.email);
    await ImapController.updateUserById({_id: user._id}, {listener_active: true});
    await ImapController.listenForUser(user, "start", function(x, y){
        console.log(x, y, "new email update");
        RedisDB.lPush("email_update_for_user", user._id.toHexString() );
    }).catch(e=>{
        if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
            console.warn("user listener crashed restarting reason: ", e.message, user.email);
            setTimeout(x=>{
                RedisDB.lPush(LISTEN_USER_KEY, user._id.toHexString())
            }, 10*1000)
        }
    });
};



