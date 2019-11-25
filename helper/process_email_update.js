fm.Include("com.anoop.imap.Controller");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
let ImapController = com.anoop.imap.Controller;
async function next() {
    RedisDB.BLPopListner('email_update_for_user', async function(err, data ){
        if(err) {
            console.error(err);
            return next();
        }
        try{
            let [key, user_id] = data;
            await ImapController.updateForUser(user_id);
        }catch(e) {
            console.error(e);
        } finally {
            next();
        }
    });
}
next();