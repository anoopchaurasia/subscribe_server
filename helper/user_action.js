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

    async function reAddToRedis(data, err, key) {
        let action  = JSON.parse(data[1]);
        action.error_count = action.error_count || 0
        action.error_count++;
        if(action.error_count) {
            ImapController.logToSentry(err, {list: 'imap_user_actions', error_count: action.error_count, tags: {user_domain: action.args[0], from: action.args[1].split("@")[1], action: action.action } })
        }
        await RedisDB.lPushAsync(key || 'imap_user_actions', JSON.stringify(action))
    }

    RedisDB.BLPopListner('imap_user_actions_new', async function(data, next){
        let {user_key, active_key} = data[1];
        await listenForUserKey(user_key, async function(){
            await RedisDB.base.delKEY(active_key);
            next();
        });
        return true;
    });
    async function listenForUserKey(key, finish_cb) {
        let destroy_cb = RedisDB.BLPopListner(key, async function(data){
            let action  = JSON.parse(data[1]);
            if(action.error_count> 3) {
                console.error(`error occured more than {action.error_count} times for `, data[1])
                return;
            }
            try{
                console.log(action.action)
                action.args[0] = await ImapController.UserModel.getRedisUser(action.args[0]);
                await ImapController[action.action](...action.args, async function onDIsconect() {
                    console.warn("disconnected crashing");
                    await reAddToRedis(data, new Error("not connected in time"), key);
                });
            }catch(e) {
                console.error(e);
                if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                    console.warn("user imap_user_actions crashed restarting reason: ", e.message, data[1]);
                    await reAddToRedis(data, e, key);
                } else {
                    ImapController.logToSentry(e, {list: 'imap_user_actions', tags: {user_id: action.args[0]._id.toHexString(), from: action.args[1].split("@")[1], action: action.action } })
                }
            }
            let len = await RedisDB.listLength(key);
            if(len ==0 && destroy_cb) {
                destroy_cb();
                finish_cb();
            }
        })
    }

});
