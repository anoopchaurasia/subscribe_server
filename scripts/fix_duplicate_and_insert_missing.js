'use strict'

let {
    on_db_connection
} = require("./../base");

on_db_connection(function () {
    console.log("Connected to database")
    setTimeout(x => {
        runJob();
    }, 10 * 1000);
});

fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
let key;
try {
    key = require("fs").readFileSync("./listner_key").toString();
} catch (e) {
    console.log("no file", e);
}

let LISTEN_USER_KEY = key.trim();
console.log('new key', LISTEN_USER_KEY);
async function runJob(offset = 0) {
    let obj = await getRunning()
    console.log("running keys", Object.keys(obj).length);
    const cursor = await ImapController.UserModel.getCursor({
        listener_active: true,
        inactive_at: null,
    }, {
        _id: 1,
        email: 1
    }, offset);
    cursor.eachAsync(async user => {
        if (!obj[user._id.toHexString()]) {
            console.log("missing", user.email);
        }
    });
}

async function getRunning() {
    let keys = await RedisDB.base.getKEYS(LISTEN_USER_KEY + "_*");
    let obj = {};
    await keys.asynForEach(async k => {
        console.log(k)
        let c = await RedisDB.base.listLength(k);
        c && c.forEach(x => {
            obj[x] = obj[x] || 0;
            obj[x]++;
            if (obj[x] > 1) {
                console.log("duplicate", x, obj[x]);
            }
        })
    })
    return obj;
}