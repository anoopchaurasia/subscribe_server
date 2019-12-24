fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.imap.Controller", x=>{
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('process_user_login', async function([key, client_token]){
        try{
            let user = await ImapController.TokenModel.getUserByToken(client_token);
            ImapController.extractEmail(user,  function(){
                RedisDB.lPush('process_user_login', client_token);
            }).catch(err => {
                console.error(err.message, err.stack);
                ImapController.scanFinished(user._id);
            });
        }catch(e) {
            console.error(e);
        }
    });

});    

