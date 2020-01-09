fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('db_user_actions', async function(data){
        let action  = JSON.parse(data[1]);
        try{
            console.log("action came",action)
            await ImapController.updateEmailDetailByFromEmail(...action.args);
        }catch(e) {
            console.error(e);
            ImapController.logToSentry(e, {list: 'db_user_actions', tags: {user_id: action.args[0], from: action.args[1].split("@")[1], action: action.args[2] } })
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user db_user_actions crashed restarting reason: ", e.message, data[1]);
                RedisDB.lPush('db_user_actions', data[1])
            }
        }
    });

    RedisDB.BLPopListner('qc_db_user_actions', async function(data){
        let action  = JSON.parse(data[1]);
        try{
            console.log("action came",action)
            await ImapController[action.action](...action.args);
        }catch(e) {
            console.error(e);
            ImapController.logToSentry(e, {list: 'qc_db_user_actions', tags: {user_id: action.args[0], from: action.args[1].split("@")[1], action: action.args[2] } })
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user qc_db_user_actions crashed restarting reason: ", e.message, data[1]);
                RedisDB.lPush('qc_db_user_actions', data[1])
            }
        }
    });
});
