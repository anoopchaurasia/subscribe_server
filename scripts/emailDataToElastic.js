'use strict';
let { on_db_connection } = require("../base");
fm.Include("com.anoop.model.EmailData")
let EmailData = com.anoop.model.EmailData;
let completed = 0;
try {
    completed =  require("fs").readFileSync("es_counter").toString()*1;
} catch(e){
    console.error(e.message)
}

console.log("starting at", completed);

async function aa (){
    let cursor = await EmailData.getCursor({}, {_id:0}, completed);
    cursor.eachAsync(async x=>{
        await storeData(x);
    });
}
on_db_connection(function(){
    aa()
});
setInterval(x=>{
    console.log("saving counter", completed/1000, "k");
    require("fs").writeFileSync("es_counter", completed);
}, 5*1000);
let serving_array = [], update_save_timeout;
async function storeData(set) {
    clearTimeout(update_save_timeout);
    serving_array.push(set);

    if (serving_array.length == 2000) {
        let arr = [...serving_array];
        serving_array = [];
        await EmailData.bulkSave(arr);
        completed += 2000
    }
    update_save_timeout = setTimeout(async () => {
        await EmailData.bulkSave(serving_array);
        serving_array = [];
    }, 10000)
}


