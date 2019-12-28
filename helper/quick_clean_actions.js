

fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('qc_scan_user_boxes', async function(data){
        let user = await ImapController.UserModel.getRedisUser(data[1]);
        try{
            console.log("qc_scan_user_boxes", data[1]);
            await ImapController.extractAllEmail(user)
        }catch(e) {
            console.error(e);
            if(!e.message.match(global.INVALID_LOGIN_REGEX)) {
                console.warn("user qc_scan_user_boxes crashed restarting reason: ", e.message);
                RedisDB.lPush('qc_scan_user_boxes', data[1])
            } else{
                await ImapController.scanFinishedQuickClean(user._id);
            }
        }
    });
});
