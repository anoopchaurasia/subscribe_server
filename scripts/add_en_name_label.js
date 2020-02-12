let {on_db_connection} = require("./../base.js");
on_db_connection(start);
let translator = require("./../helper/google_translation");

let label_mongoose = require("./../models/labelData");
async function start() {
    let cursor = label_mongoose.find({en_name: null}, {label_name:1}).limit(10).lean().cursor();
    let arr = [];
    await cursor.eachAsync(async x=>{
        arr.push(x)
    }).then(()=> console.log("done"));
    let db_setter = [];
    (await translator.translate(arr.map(x=> x.label_name)))
    .data.translations.forEach((x, i)=> {
        db_setter.push([{_id: arr[i]._id}, {en_name: x.translatedText.trim().replace(/\s\/\s/, "/").replace(/\[Google Mail\]/, "[Gmail]")}])
    });
    await bulkSaveToDB(db_setter);
}

async function bulkSaveToDB(serving_array) {
    if (serving_array.length == 0) return
    var bulk = label_mongoose.collection.initializeOrderedBulkOp();
    serving_array.forEach(([query, set]) => {
        bulk.find(query).upsert().update({$set:set});
    });
    await bulk.execute(function (error) {
        if (error) return console.error(error, "while saving emaildata for user");
        console.log("saved emaildata for user", serving_array.length);
    });
}