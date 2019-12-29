fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('db_user_actions', async function(data){
        let action  = JSON.parse(data[1]);
        try{
            await ImapController.updateEmailDetailByFromEmail(...action.args);
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user db_user_actions crashed restarting reason: ", e.message, data[1]);
                RedisDB.lPush('db_user_actions', data[1])
            }
        }
    });
});
