'use strict'
console.log("is Master in watcher");
const UserModel = require('../models/user');
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

let LISTEN_USER_KEY = "listen_for_user";

let cluster = require("cluster");

if(cluster.isMaster) {
    let instances = process.env.TOTAL_LISTNERS||4;
    for(let i=0; i< instances; i++) {
        cluster.fork();
    }

    setTimeout(x=>{
        onNewUser();
        runJob();
    }, 10*1000);

    async function runJob(offset=0 ){
        console.log("scheduler called for scrapping mail for imap...");
        let counter = offset;
        const cursor = await UserModel.find({ "email_client": "imap" }, {_id: 1}).skip(offset).cursor();
        cursor.eachAsync(async user => {
            RedisDB.lPush(LISTEN_USER_KEY, user._id.toHexString());
            counter++;
        }).catch(async e => {
            console.error("watch error", counter, e);
            if (e.codeName == "CursorNotFound") {
                runJob(counter);
            }
        })
        .then(() => {
            console.log('done!')
        })
    };

    function onNewUser(){
        ImapController.onNewUser(async x=>{
            let user = await ImapController.getUserById(x);
            console.log("new user added", user);
            if(user.listener_active && user.inactive_at==null) {
                return false;
            }
            RedisDB.lPush(LISTEN_USER_KEY, user._id.toHexString());
            console.log("setting for new user", user._id);
        });
    }
}else {
    RedisDB.BLPopListner(LISTEN_USER_KEY, async function([key, user_id]){
        let user = await ImapController.getUserById(user_id);
        await scrapEmailForIamp(user).catch(err => {
            console.error(err.message, "user -> ", user.email);
        });
    });
    async function scrapEmailForIamp(user){
        console.log("here ->",user.email, cluster.worker.id);
        await ImapController.updateUserById({_id: user._id}, {listener_active: true});
        await ImapController.listenForUser(user, "start", function(x, y){
            console.log(x, y, "new email update");
            RedisDB.lPush("email_update_for_user", user._id.toHexString() );
        });
    };
}


