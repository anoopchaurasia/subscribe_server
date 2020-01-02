
fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner(["process_user_login", 'email_update_for_user'], async function([key ,data]){
        console.log(key, data);
        switch(key) {
            case 'email_update_for_user': return await handleUpdate(data);
            case 'process_user_login': return await handleLogin(data);
        }
    });

    RedisDB.BLPopListner("process_user_login1", async function([key ,data]){
        return await handleLogin(data);
    });

    async function handleLogin(data) {
        try{
            if(error_count>3) {
                ImapController.scanFinished(user._id);
                return console.error("not trying as failed 3 times already",  data);
            }
            let [user_id, error_count=0] = data.split("#");
            let user = await ImapController.UserModel.getRedisUser(user_id);
            await ImapController.extractEmail(user,  function(){
                error_count = error_count*1;
                ImapController.logToSentry(new Error("user disconnected"), {list: 'email_update_for_user', error_count: error_count+1, tags: {user_email: user.email.split("@")[1]} })
                RedisDB.lPush('process_user_login1', user_id+"#"+(error_count+1));
            }).catch(err => {
                ImapController.logToSentry(err, {list: 'process_user_login', tags: {user_email: user.email.split("@")[1]} })
                console.error(err.message, err.stack);
                ImapController.scanFinished(user._id);
            });
        }catch(e) {
            console.error(e);
        }
    }


    async function handleUpdate(data) {
        let user;
        try{
            let [user_id, error_count=0] = data.split("#");
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
                ImapController.logToSentry(err, {list: 'email_update_for_user', error_count: error_count+1, tags: {user_email: user.email.split("@")[1]} })
                error_count = error_count*1;
                RedisDB.lPush('email_update_for_user', user_id+"#"+(error_count+1));
            });
        }catch(e) {
            ImapController.logToSentry(e, {list: 'email_update_for_user', tags: {user_email: user.email.split("@")[1]} })
            console.error(e);
        }
    }

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
                
                RedisDB.lPush('email_update_for_user', user_id+"#"+(error_count+1));
            });
        }catch(e) {
            ImapController.logToSentry(e, {list: 'email_update_for_user', tags: {user_email: user.email.split("@")[1]} })
            console.error(e);
        }
    });
});