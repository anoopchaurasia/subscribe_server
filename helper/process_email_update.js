
fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    const WAIT_TIME_FOR_AWAIT_FAIL = 30*60*1000;
    let timeoutconst;
    RedisDB.BLPopListner(["process_user_login", 'email_update_for_user'], async function([key ,data]){
        console.log(key, data);
        clearTimeout(timeoutconst);
        timeoutconst = setTimeout(()=>{
            throw new Error("no response from application action after 1 hrs");
        }, WAIT_TIME_FOR_AWAIT_FAIL);
        switch(key) {
            case 'email_update_for_user':  await handleUpdate(data); break;
            case 'process_user_login':  await handleLogin(data); break;
        }
        clearTimeout(timeoutconst);
    });

    async function handleLogin(data) {
        let user_id, error_count;
        try{
            [user_id, error_count=0] = data.split("#");
            if(error_count>3) {
                ImapController.scanFinished(user_id);
                return console.error("not trying as failed 3 times already",  data);
            }
            let user = await ImapController.UserModel.getRedisUser(user_id);
            await ImapController.extractEmail(user,  function(){
                error_count = error_count*1;
                ImapController.logToSentry(new Error("user disconnected"), {list: 'email_update_for_user', error_count: error_count+1, tags: {user_email: user.email.split("@")[1]} })
                RedisDB.lPush('process_user_login', user_id+"#"+(error_count+1));
            }).catch(err => {
                ImapController.logToSentry(err, {list: 'process_user_login', tags: {user_email: user.email.split("@")[1]} })
                console.error(err.message, err.stack);
                ImapController.scanFinished(user._id);
            });
        }catch(e) {
            console.error(e);
            ImapController.scanFinished(user_id);
        }
    }


    async function handleUpdate(data) {
        let user;
        try{
            let [user_id, error_count=0] = data.split("#");
            if(error_count>3) {
                return console.error("not trying as failed 3 times already", data);
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
            console.error(e);
            ImapController.logToSentry(e, {list: 'email_update_for_user', tags: {user_email: user && user.email && user.email.split("@")[1]} })
        }
    }
});