fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.imap.Controller");
const token_model = require('../models/tokeno');

let ImapController = com.anoop.imap.Controller;
async function next() {
    RedisDB.BLPopListner('process_user_login', async function(err, data ){
        if(err) {
            console.error(err);
            return next();
        }
        try{
            let [key, token] = data;
            const doc = await token_model.findOne({ "token": token });
            Controller.extractEmail(doc).catch(err => {
                console.error(err.message, err.stack);
                Controller.scanFinished(doc.user_id);
            });
        }catch(e) {
            console.error(e);
        } finally {
            next();
        }
    });
}
next();