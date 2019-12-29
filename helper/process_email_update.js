fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('email_update_for_user', async function(data){
        let user;
        try{
            let [user_id, error_count=0] = data[1].split("#");
            console.log("token", user_id);
            user = await ImapController.UserModel.getRedisUser(user_id);
            let last_msgId = await ImapController.UserModel.getLastMsgId(user);
            if(last_msgId) {
                user.last_msgId = last_msgId;
            }
            await ImapController.updateForUser(user, function(err){
                ImapController.logToSentry(err, {list: 'email_update_for_user', tags: {user_email: user.email.split("@")[1]} })
                error_count = error_count*1;
                RedisDB.lPush('email_update_for_user1', user_id+"#"+(error_count+1));
            });
        }catch(e) {
            ImapController.logToSentry(e, {list: 'email_update_for_user', tags: {user_email: user.email.split("@")[1]} })
            console.error(e);
        }
    });
    RedisDB.BLPopListner('email_update_for_user1', async function(data){
        let user;
        try{
            let [user_id, error_count=0] = data[1].split("#");
            if(error_count>3) {
                return console.error("not trying as failed 3 times already");
            }
            console.log("token", user_id);
            user = await ImapController.UserModel.getRedisUser(user_id);
            let last_msgId = await ImapController.UserModel.getLastMsgId(user);
            if(last_msgId) {
                user.last_msgId = last_msgId;
            }
            await ImapController.updateForUser(user, function(err){
                ImapController.logToSentry(err, {list: 'email_update_for_user', tags: {user_email: user.email.split("@")[1]} })
                error_count = error_count*1;
                
                RedisDB.lPush('email_update_for_user1', user_id+"#"+(error_count+1));
            });
        }catch(e) {
            ImapController.logToSentry(e, {list: 'email_update_for_user', tags: {user_email: user.email.split("@")[1]} })
            console.error(e);
        }
    });
});