'use strict';
let { on_db_connection } = require("../base");
fm.Include("com.anoop.model.EmailData")
let EmailData = com.anoop.model.EmailData;
async function aa (){
    let cursor = await EmailData.getCursor({}, {_id:0});
    cursor.eachAsync(async x=>{
        await storeData(x);
    });
}
on_db_connection(function(){
    aa()
})
let serving_array = [], update_save_timeout;
async function storeData(set) {
    clearTimeout(update_save_timeout);
    serving_array.push(set);

    if (serving_array.length == 2000) {
        let arr = [...serving_array];
        serving_array = [];
        await EmailData.bulkSave(arr);
    }
    update_save_timeout = setTimeout(async () => {
        await EmailData.bulkSave(serving_array);
        serving_array = [];
    }, 10000)
}


