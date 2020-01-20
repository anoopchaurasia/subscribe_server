'use strict';
let {
    on_db_connection
} = require("../base");
const mongo_emaildata = require('./../models/emailsData');

fm.Include("com.anoop.model.EmailData")
let EmailData = com.anoop.model.EmailData;

async function startwatch() {
    mongo_emaildata.watch([
        {
            '$match': {
                'operationType': { '$in': ['insert','update','updateMany'] }
            }
        }
    ], { fullDocument : "updateLookup" }
    ).on('change', async (inserted) => {
        console.log("inseted")
        await insertDoc(inserted.fullDocument).catch(e => console.error(e));
    });
}

on_db_connection(function () {
    startwatch();
});


let serving_array = [], update_save_timeout;
async function insertDoc(set) {
    console.log(set)
    delete set._id;
    clearTimeout(update_save_timeout);
    serving_array.push(set);
    if (serving_array.length == 200) {
        let arr = [...serving_array];
        serving_array = [];
        await EmailData.bulkSave(arr)
    }
    update_save_timeout = setTimeout(async () => {
        await EmailData.bulkSave(serving_array)
        serving_array = [];
    }, 10000)
}