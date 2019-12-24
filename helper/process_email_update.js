fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('email_update_for_user', async function(data){
        try{
            console.log("token", data[1]);
            let user = await ImapController.TokenModel.getUserByToken(data[1]);
            await ImapController.updateForUser(user, function(){
                RedisDB.lPush('email_update_for_user', data[1]);
            });
        }catch(e) {
            console.error(e);
        }
    });
});