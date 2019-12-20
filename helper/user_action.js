fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;

    RedisDB.BLPopListner('imap_user_actions', async function(data){
        try{
            let action  = JSON.parse(data[1]);
            await ImapController[action.action](...action.args);
        }catch(e) {
            console.error(e);
            if(!e.message.includes("Invalid credentials")) {
                console.warn("user imap_user_actions crashed restarting reason: ", e.message);
                RedisDB.lPush('imap_user_actions', data[1])
            }
        }
    });

    RedisDB.BLPopListner('db_user_actions', async function(data){
        try{
            let action  = JSON.parse(data[1]);
            await ImapController.updateMyDetail(...action.args);
        }catch(e) {
            console.error(e);
            if(!e.message.includes("Invalid credentials")) {
                console.warn("user db_user_actions crashed restarting reason: ", e.message);
                RedisDB.lPush('db_user_actions', data[1])
            }
        }
    });
});
