'use strict';
let {
    on_db_connection
} = require("../base");
fm.Include("com.anoop.model.EmailData")
let EmailData = com.anoop.model.EmailData;
let completed = 0;
try {
    completed = require("fs").readFileSync("es_counter").toString() * 1;
} catch (e) {
    console.error(e.message)
}
let last_send = Date.now;
console.log("starting at", completed);
const EventEmitter = require('events').EventEmitter;
require('events').EventEmitter.defaultMaxListeners = 25
const eventEmiiter = new EventEmitter();
async function aa() {
    let cursor = await EmailData.getCursor({}, {
        _id: 0
    }, completed);
    last_send = Date.now()
    cursor.eachAsync(async x => {
        last_send = Date.now;
        await storeData_1(x);
    });

}

let pending = ["senddata1", "senddata2", "senddata3"];
let list = [];
eventEmiiter.on("senddata1", function () {
    pending.push("senddata1");
});
eventEmiiter.on("senddata2", function () {
    pending.push("senddata2");
});
eventEmiiter.on("senddata3", function () {
    pending.push("senddata3");
});
async function storeData_1(x) {
    list.push(x);
    if (list.length > 4000) {
        let key = pending.shift();
        if(key) {
            storeData(list.splice(0, 4000), key);
        } else {
            console.log("more than 12000 docs");
            await storeData(list.splice(0, 4000));
        }
    }
}

let start = Date.now();
let start_c = completed;

on_db_connection(function () {
    aa();
});
setInterval(x => {
    if ((Date.now - last_send) > 60 * 1000) {
        console.error("no action for last 60 seconds")
        return process.exit(345);
    }
    console.log("saving counter", completed / 100000, (completed - start_c) / 100000, Date.now() - start);
    require("fs").writeFileSync("es_counter", completed);
}, 5 * 1000);
async function storeData(arr, type) {
    console.log("saved", type, arr.length);
    arr.length && (await EmailData.bulkSave(arr));
    completed += arr.length
    type && eventEmiiter.emit(type);
}