fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.imap.Controller");
const token_model = require('../models/tokeno');

let ImapController = com.anoop.imap.Controller;
RedisDB.BLPopListner('process_user_login', async function(token){
    if(err) {
        console.error(err);
    }
    try{
        const doc = await token_model.findOne({ "token": token });
        ImapController.extractEmail(doc).catch(err => {
            console.error(err.message, err.stack);
            ImapController.scanFinished(doc.user_id);
        });
    }catch(e) {
        console.error(e);
    }
});

