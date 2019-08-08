'use strict'

let cluster = require("cluster");
const UserModel = require('../models/user');
if(cluster.isMaster) {
    const schedule = require('node-schedule');
    let services = (process.env.WORKER_COUNT || 1)*1;
    for(let p=0; p<services; p++) {
        let worker = cluster.fork({});
        worker.on('message', x=>{
            console.log(x, worker.id);
            if(x=="give_me_work") {
                give_me_work(worker);
            }
        })
    }
    let is_running = false;
    let free_workers = [], myCursor;
    schedule.scheduleJob('*/1 * * * *',async () => { 
        if(is_running) return false;
        is_running = true;
        myCursor = await UserModel.find({"email_client":"imap"}, {_id:1}).cursor();
        free_workers.forEach(w=>{
            give_me_work(w);
        });
        console.log("scheduler called for scrapping mail for imap...");
    });

    async function give_me_work(worker){
        if(!is_running || !myCursor) {
            return  free_workers.push(worker);
        }
        try{
            let user = await myCursor.next();
            if(user) {
                worker.send({user_id: user._id});
            } else {
                is_running = false;
                free_workers.push(worker);
            }
        } catch(e){
            console.error(e.message, "failed cursor");
        } finally{
            if(free_workers.indexOf(worker)==-1) {
                free_workers.push(worker);
            }
        }
    };

    console.log("is Master in watcher");
} else {
    console.log("child");
    fm.Include("com.anoop.imap.Controller");
    let Controller = com.anoop.imap.Controller;
    Array.prototype.asynForEach = async function (cb) {
        for (let i = 0, len = this.length; i < len; i++) {
            await cb(this[i]);
        }
    }

    function givmeWork() {
        console.log("give me work");
        process.send("give_me_work");
    }
    process.on('message', async (data) => {
        await scrapEmailForIamp(data);
    });
    async function scrapEmailForIamp({user_id}) {
        try{
            let user =await UserModel.find({_id: user_id}).exec()
            console.log("here ->",user.email)
            await Controller.extractEmailForCronJob(user);
        } catch(e) {
            console.error(e.message, "failed scrap imap");
        } finally {
            process.send("give_me_work");
        }
    };
    setTimeout(x=>{
        givmeWork();
    }, 10000)
}
