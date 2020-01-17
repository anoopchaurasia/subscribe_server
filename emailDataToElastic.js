'use strict';
let { on_db_connection } = require("./base");
var client = require('./elastic/connection.js');

on_db_connection(function () {
    console.log("dsdssdsd")
    setTimeout(async x=>{
        const mongo_emaildata = require('./models/emailsData');
        console.log(mongo_emaildata)
        var cursor =await mongo_emaildata.find({}).lean();
        // let data;
        // data =cursor[0];
        // delete data['_id'];
        // console.log(data)
        // await bulkSave([cursor[0]]);
        await cursor.asyncForEach(async data => {
            console.log(data)
            delete data._id;
            await bulkSave([data]);
        });
    }, 5*1000);
})




async function bulkSave(serving_array) {
    if (serving_array.length == 0) return
    let bulkBody = [];
    serving_array.forEach(item => {
        bulkBody.push({
            index: {
                _index: 'emaildata',
                _type: 'emaildata',
                _id: item.user_id + item.email_id + item.box_name
            }
        });

        bulkBody.push(item);
    });
    console.log("indexing ", serving_array.length);
    let response = await client.bulk({ body: bulkBody })

        .catch(console.err);
    let errorCount = 0;
    response.items.forEach(item => {
        if (item.index && item.index.error) {
            console.log(++errorCount, item.index.error);
        }
    });
    console.log(
        `Successfully indexed ${serving_array.length - errorCount}
     out of ${serving_array.length} items`)


}






