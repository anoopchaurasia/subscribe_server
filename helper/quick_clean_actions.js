

fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    const WAIT_TIME_FOR_AWAIT_FAIL = 30*60*1000;
    let timeoutconst;
    RedisDB.BLPopListner('qc_scan_user_boxes', async function(data){
        let [user_id, error_count=0, completed=[]] = data[1].split("#");
        let user = await ImapController.UserModel.getRedisUser(user_id);
        if(error_count>3) {
            ImapController.scanFinishedQuickClean(user_id);
            ImapController.logToSentry(new Error("qc: not trying as failed 3 times already"), {user_id: user_id});
            return console.error("not trying as failed 3 times already",  data);   
        }
        clearTimeout(timeoutconst);
        timeoutconst = setTimeout(()=>{
            throw new Error("no response from application action after 1 hrs");
        }, WAIT_TIME_FOR_AWAIT_FAIL);
        try{
            if(completed.length) {
                console.log("completed", completed);
            }
            console.log("qc_scan_user_boxes", data[1]);
            await ImapController.extractAllEmail(user, function(completed=[]){
                error_count = error_count*1;
                ImapController.logToSentry(new Error("user disconnected"), {list: 'qc_scan_user_boxes', error_count: error_count+1, tags: {user_email: user.email.split("@")[1]} })
                RedisDB.lPush('qc_scan_user_boxes', user_id+"#"+(error_count+1)+"#"+JSON.stringify(completed));
            }, completed)
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                error_count = error_count*1;
                console.warn("user qc_scan_user_boxes crashed restarting reason: ", e.message);
                RedisDB.lPush('qc_scan_user_boxes#'+(error_count+1), data[1])
            } else{
                await ImapController.scanFinishedQuickClean(user._id);
            }
        }finally{
            clearTimeout(timeoutconst);
        }
    });
});
