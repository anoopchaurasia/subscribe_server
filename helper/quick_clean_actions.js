

fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('qc_scan_user_boxes', async function(data){
        let [user_id, error_count=0] = data[1].split("#");
        let user = await ImapController.UserModel.getRedisUser(user_id);
        if(error_count>3) {
            ImapController.scanFinishedQuickClean(user_id);
            ImapController.logToSentry(new Error("qc: not trying as failed 3 times already"), {user_id: user_id});
            return console.error("not trying as failed 3 times already",  data);   
        }
        try{
            console.log("qc_scan_user_boxes", data[1]);
            await ImapController.extractAllEmail(user, function(){
                error_count = error_count*1;
                ImapController.logToSentry(new Error("user disconnected"), {list: 'qc_scan_user_boxes', error_count: error_count+1, tags: {user_email: user.email.split("@")[1]} })
                RedisDB.lPush('qc_scan_user_boxes', user_id+"#"+(error_count+1));
            })
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                error_count = error_count*1;
                console.warn("user qc_scan_user_boxes crashed restarting reason: ", e.message);
                RedisDB.lPush('qc_scan_user_boxes#'+(error_count+1), data[1])
            } else{
                await ImapController.scanFinishedQuickClean(user._id);
            }
        }
    });
});
