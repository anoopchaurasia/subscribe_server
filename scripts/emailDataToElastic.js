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
const EventEmitter = require('events');
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

let list = [];
async function storeData_1(x) {
    list.push(x);
    eventEmiiter.on("senddata", function () {
        storeData(list.splice(0, 4000))
    });
    if (list.length > 10000) {
        console.log("more than 10000 docs");
        await storeData(list.splice(0, 4000));
    }
}

let start = Date.now();
let start_c = completed;

on_db_connection(function () {
    aa()
});
setInterval(x => {
    if ((Date.now - last_send) > 60 * 1000) {
        console.error("no action for last 60 seconds")
        return process.exit(345);
    }
    console.log("saving counter", completed / 100000, (completed - start_c) / 100000, Date.now() - start);
    require("fs").writeFileSync("es_counter", completed);
}, 5 * 1000);
let serving_array = [],
    update_save_timeout;
async function storeData(set) {
    clearTimeout(update_save_timeout);
    serving_array.push(...set);

    if (serving_array.length >= 4000) {
        let arr = [...serving_array];
        serving_array = [];
        await EmailData.bulkSave(arr);
        eventEmiiter.emit("senddata")
        completed += serving_array.length
    }
    update_save_timeout = setTimeout(async () => {
        await EmailData.bulkSave(serving_array);
        serving_array = [];
    }, 10000)
}