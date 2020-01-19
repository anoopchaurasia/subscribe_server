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
const EventEmitter = require('events').EventEmitter();
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

let list = [], is_first=true;
async function storeData_1(x) {
    list.push(x);
    eventEmiiter.on("senddata1", function () {
        storeData(list.splice(0, 4000), "senddata1")
    });
    eventEmiiter.on("senddata2", function () {
        storeData(list.splice(0, 4000), "senddata2")
    });
    eventEmiiter.on("senddata3", function () {
        storeData(list.splice(0, 4000), "senddata3")
    });
    if (list.length > 12000) {
        console.log("more than 12000 docs");
        if(is_first) {
                eventEmiiter.emit("senddata1")
                eventEmiiter.emit("senddata2");
                eventEmiiter.emit("senddata3");
        } else {
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
    await EmailData.bulkSave(arr);
    completed += arr.length
    type && eventEmiiter.emit(type);
    
}