fm.Include("com.anoop.imap.Controller");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
let ImapController = com.anoop.imap.Controller;
RedisDB.BLPopListner('email_update_for_user', async function(user_id){
    if(err) {
        console.error(err);
    }
    try{
        console.log("user_id", user_id);
        await ImapController.updateForUser(user_id);
    }catch(e) {
        console.error(e);
    }
});