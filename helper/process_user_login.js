fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.imap.Controller", x=>{
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('process_user_login', async function([key, user_id]){
        try{
            let user = await ImapController.UserModel.getRedisUser(user_id);
            ImapController.extractEmail(user,  function(){
                RedisDB.lPush('process_user_login', user_id);
            }).catch(err => {
                console.error(err.message, err.stack);
                ImapController.scanFinished(user._id);
            });
        }catch(e) {
            console.error(e);
        }
    });

});    

