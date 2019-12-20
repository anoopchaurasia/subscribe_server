fm.Include("com.anoop.imap.Controller", function(){
    let RedisDB = com.jeet.memdb.RedisDB;
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('imap_user_actions', async function(data){
        try{
            let action  = JSON.parse(data[1]);
            await ImapController[action.action](...action.args);
        }catch(e) {
            console.error(e);
        }
    });
    RedisDB.BLPopListner('db_user_actions', async function(data){
        try{
            let action  = JSON.parse(data[1]);
            await ImapController.updateMyDetail(...action.args);
        }catch(e) {
            console.error(e);
        }
    });
});
