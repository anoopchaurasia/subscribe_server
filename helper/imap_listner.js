'use strict'
console.log("is Master in watcher");
const UserModel = require('../models/user');
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}


setTimeout(x=>{
    runJob();
}, 10*1000);


async function runJob(offset=0 ){
    console.log("scheduler called for scrapping mail for imap...");
    let counter = offset;
    const cursor = await UserModel.find({ "email_client": "imap" }).skip(offset).cursor();
    cursor.eachAsync(async user => {
        await scrapEmailForIamp(user).catch(err => {
            console.error(err.message, "user -> ", user.email);
        });
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

async function scrapEmailForIamp(user){
    console.log("here ->",user.email)
   await ImapController.listenForUser(user);
};

