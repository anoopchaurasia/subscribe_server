fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('email_update_for_user', async function(data){
        try{
            console.log("user_id", data[1]);
            await ImapController.updateForUser(data[1], function(){
                RedisDB.lPush('email_update_for_user', data[1]);
            });
        }catch(e) {
            console.error(e);
        }
    });
});