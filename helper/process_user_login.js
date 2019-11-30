fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
const token_model = require('../models/tokeno');
fm.Include("com.anoop.imap.Controller", x=>{
    let ImapController = com.anoop.imap.Controller;
    RedisDB.BLPopListner('process_user_login', async function([key, user_id]){
        try{
            ImapController.extractEmail(user_id).catch(err => {
                console.error(err.message, err.stack);
                ImapController.scanFinished(user_id);
            });
        }catch(e) {
            console.error(e);
        }
    });

});    

