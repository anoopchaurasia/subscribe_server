fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('imap_user_actions', async function(data){
        let action  = JSON.parse(data[1]);
        if(action.error_count> 3) {
            console.error(`error occured more than {action.error_count} times for `, data[1])
            return;
        }
        try{
            console.log(action.action)
            action.args[0] = await ImapController.UserModel.getRedisUser(action.args[0]);
            await ImapController[action.action](...action.args, function onDIsconect() {
                console.warn("disconnected crashing");
                reAddToRedis(data, new Error("not connected in time"));
            });
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user imap_user_actions crashed restarting reason: ", e.message, data[1]);
                reAddToRedis(data, e);
            } else {
                ImapController.logToSentry(e, {list: 'imap_user_actions', tags: {user_id: action.args[0]._id.toHexString(), from: action.args[1].split("@")[1], action: action.action } })
            }
        }
    });

    function reAddToRedis(data, err) {
        let action  = JSON.parse(data[1]);
        action.error_count = action.error_count || 0
        action.error_count++;
        if(action.error_count) {
            ImapController.logToSentry(err, {list: 'imap_user_actions', tags: {user_domain: action.args[0], from: action.args[1].split("@")[1], action: action.action } })
        }
        RedisDB.lPush('imap_user_actions', JSON.stringify(action))
    }
});
