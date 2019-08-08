'use strict'

let cluster = require("cluster");
const UserModel = require('../models/user');
if(cluster.isMaster) {
    const schedule = require('node-schedule');
    let services = (process.env.WORKER_COUNT || 1)*1;
    for(let p=0; p<services; p++) {
        let worker = cluster.fork({});
        worker.on('message', x=>{
            if(x=="give_me_work") {
                console.log(x, worker.id);
                give_me_work(worker);
            }
        })
    }
    let is_running = false;
    let myCursor;
    schedule.scheduleJob('*/1 * * * *',async () => { 
        if(is_running) return false;
        is_running = true;
        myCursor = await UserModel.find({"email_client":"imap"}, {_id:1}).cursor();
        for(let w in cluster.workers){
            cluster.workers[w].send({data_available: true});
        }
        console.log("scheduler called for scrapping mail for imap...");
    });

    async function give_me_work(worker){
        if(!is_running || !myCursor) {
            return;
        }
        try{
            let user = await myCursor.next();
            if(user) {
                worker.send({user_id: user._id});
            } else {
                is_running = false;
            }
        } catch(e){
            is_running = false;
            console.error(e.message, "failed cursor");
            await myCursor.close();
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
        process.send("give_me_work");
    }
    process.on('message', async (data) => {
        data.user_id && scrapEmailForIamp(data);
        data.data_available && !is_working && givmeWork();
    });
    let is_working = false;
    async function scrapEmailForIamp({user_id}) {
        try{
            is_working = true;
            let user =await UserModel.findOne({_id: user_id}).exec()
            console.log("here ->",user.email)
            await Controller.extractEmailForCronJob(user);
        } catch(e) {
            console.error(e.message, "failed scrap imap");
        } finally {
            is_working = false;
            givmeWork();
        }
    };
}
