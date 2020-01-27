'use strict';

global.sendToManager = async function(data) {
    senddata(data)
}
const dgram = require('dgram');
let client;
function reconnect() {
    client = dgram.createSocket('udp4');
    client.on('error', reconnect);
}
reconnect();
let datatosend = [];
async function senddata(message){
    datatosend.push(message);
}
let os = require("os");
async function send() {
    if(datatosend.length==0) return;
    let msgs = [... datatosend];
    datatosend = [];
    let messages = Buffer.from( JSON.stringify({data: msgs, type:"multi"}));
    await client.send(messages, 41234, process.env.MANAGER_HOST || "10.1.5.90" ||"localhost", (err) => {
        console.error(err);
    });
}

setInterval(send, 60*1000)
