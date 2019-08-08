'use strict'
console.log("is Master in watcher");
const UserModel = require('../models/user');
const schedule = require('node-schedule');
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

let is_running = false;
schedule.scheduleJob('*/1 * * * *',async () => { 
    runJob();
});

async function runJob(offset=0 ){
    if(is_running) return false;
    console.log("scheduler called for scrapping mail for imap...", is_running);
    is_running = true;
    let counter = offset;
    const cursor =await UserModel.find({"email_client":"imap"}).skip(offset).cursor();
    // console.log(cursor)
    cursor.eachAsync(async user => {
        await scrapEmailForIamp(user).catch(err => {
            console.error(err.message, "user -> ",user.email);
        });
        counter++;
    }).catch(async e=> {
        is_running = false;
        console.error("watch error", counter,e);
        if(e.codeName == "CursorNotFound") {
            runJob(counter);
        }
    })
    .then(() => {
        console.log('done!')
        is_running = false;
    })
};

async function scrapEmailForIamp(user){
    console.log("here ->",user.email)
   await Controller.extractEmailForCronJob(user);
};

