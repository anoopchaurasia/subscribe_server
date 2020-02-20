'use strict';

let http = require("http");
let op = {
 host: "172.17.0.1",
port: 51678,
 path: `/v1/tasks?dockerid=${process.env.HOSTNAME}`
}

let task_id;
// let req = http.request(op, x=> {
//     x.on("data", f=> {
//         try{
//             let info = JSON.parse(f);
//             task_id = info.Arn.split("/")[1]
//         } catch(e) {
//             console.error(e);
//         }
//     })
// })
// req.on("error", console.error);
// req.end()

/// -------------------------------------------------------



var elasticsearch=require('elasticsearch'); 
let elastic_client = new elasticsearch.Client( {  
    hosts: [
      process.env.LOG_ELASTIC_HOST || "10.1.5.92:9200"
    ]
});

global.sendLogToELastic = async function(data, type) {
    try{
        send({msg: [...data].map(x=>( x && x.stack? x.stack: x)|| x).join(" "), type, p: process.env.file, t_id: task_id})
    } catch(e) {
        console.error(e);
    }
};

global.sendValueToElastic = async function(data){
    data.t_id = task_id;
    data.p = this.process.env.file
    send(data);
}
;
let senddata = [],  timeout ;
async function send(d) {
    d.d = new Date();
    senddata.push(d);
    clearTimeout(timeout);
    if(senddata.length>=100) {
       return bulkSave();
    }
    timeout = setTimeout(x=>{
        bulkSave();
    }, 10*1000);
}


async function bulkSave() {
    let serving_array = [...senddata];
    senddata = [];
    if (serving_array.length == 0) return
    let bulkBody = [];
    serving_array.forEach(item => {
        bulkBody.push({
            index: {
                _index: 'applog',
                _type:  "_doc"
            }
        });

        bulkBody.push(item);
    });
    let response = await elastic_client.bulk({ body: bulkBody }).catch(console.err);
    let errorCount = 0;
    response.items.forEach(item => {
        if (item.index && item.index.error) {
            console.log(++errorCount, item.index.error, "errorororoor");
        }
    });
    console.log( `Successfully indexed ${serving_array.length - errorCount} out of ${serving_array.length} items`)
}