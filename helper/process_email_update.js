fm.Include("com.anoop.imap.Controller");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
let ImapController = com.anoop.imap.Controller;
RedisDB.BLPopListner('email_update_for_user process_user_login', async function(data){
    try{
        console.log("user_id", data);

        //ImapController.updateForUser(user_id);
    }catch(e) {
        console.error(e);
    }
});