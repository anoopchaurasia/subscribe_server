fm.Include("com.anoop.imap.Controller");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
let ImapController = com.anoop.imap.Controller;
async function next() {
    RedisDB.BLPopListner('email_update_for_user', async function(err, data ){
        if(err) return console.error(err);
        let [key, user_id] = data;
        await ImapController.updateForUser(user_id);
        next();
    });
}
next();