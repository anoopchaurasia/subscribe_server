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
    let myCursor;
    schedule.scheduleJob('*/1 * * * *',async () => { 
        if(is_running) return false;
        is_running = true;
        myCursor = await UserModel.find({"email_client":"imap"}, {_id:1}).cursor();
        console.log("scheduler called for scrapping mail for imap...");
    });

    async function give_me_work(worker){
        if(!is_running || !myCursor) {
            worker.send({no_work: true});
            return;
        }
        try{
            let user = await myCursor.next();
            if(user) {
                worker.send({user_id: user._id});
            } else {
                is_running = false;
                worker.send({no_work: true});
            }
        } catch(e){
            is_running = false;
            console.error(e.message, "failed cursor");
            worker.send({no_work: true});
            myCursor.close();
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
        if(data.no_work===true) {
            return i_am_free = true;
        }
        await scrapEmailForIamp(data);
    });
    
    let i_am_free = true;
    async function scrapEmailForIamp({user_id}) {
        try{
            i_am_free = false;
            let user =await UserModel.findOne({_id: user_id}).exec()
            console.log("here ->",user.email)
            await Controller.extractEmailForCronJob(user);
        } catch(e) {
            console.error(e.message, "failed scrap imap");
        } finally {
            givmeWork();
        }
    };
    setInterval(x=>{
        i_am_free && givmeWork();
    }, 10*10000);
}
