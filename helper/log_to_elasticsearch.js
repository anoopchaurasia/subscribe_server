'use strict';

let http = require("http");
let op = {
 host: "172.17.0.1",
port: 51678,
 path: `/v1/tasks?dockerid=${process.env.HOSTNAME}`
}

global.task_id=null;
let req = http.request(op, x=> {
    x.on("data", f=> {
        try{
            let info = JSON.parse(f);
            global.task_id = info.Arn.split("/")[1]
        } catch(e) {
            console.error(e);
        }
    })
})
req.on("error", console.error);
req.end()

/// -------------------------------------------------------



var elasticsearch=require('elasticsearch'); 
let elastic_client = new elasticsearch.Client( {  
    hosts: [
      process.env.LOG_ELASTIC_HOST || "10.1.5.92:9200"
    ]
});

global.sendLogToELastic = async function(data, type) {
    try{
     //   send({msg: [...data].map(x=>( x && x.stack? x.stack: x)|| x).join(" "), type, p: process.env.file, t_id: task_id})
    } catch(e) {
        console.error(e);
    }
};

global.sendValueToElastic = async function(data){
    data.t_id = task_id;
    data.p = this.process.env.file
//    send(data);
}
