fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('imap_user_actions', async function(data){
        try{
            let action  = JSON.parse(data[1]);
            console.log(action.action)
            //replace client_token with user;
            action.args[0] = await ImapController.TokenModel.getUserByToken(action.args[0]);
            await ImapController[action.action](...action.args, function onDIsconect() {
                console.warn("disconnected crashing");
                RedisDB.lPush('imap_user_actions', data[1]);
            });
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user imap_user_actions crashed restarting reason: ", e.message);
                RedisDB.lPush('imap_user_actions', data[1])
            }
        }
    });

    RedisDB.BLPopListner('db_user_actions', async function(data){
        try{
            let action  = JSON.parse(data[1]);
            await ImapController.updateEmailDetailByFromEmail(...action.args);
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user db_user_actions crashed restarting reason: ", e.message);
                RedisDB.lPush('db_user_actions', data[1])
            }
        }
    });
});
