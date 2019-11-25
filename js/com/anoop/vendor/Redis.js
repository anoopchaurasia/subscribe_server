fm.Package("com.anoop.vendor");
let client = require('redis').createClient();
client.on("error", function (err) {
    console.error("Error " + err);
});
fm.Class("Redis", function(me) {

    Static.set = function(key, value){
        return client.set(key, value);
    };
    
    Static.setJSON = function(key, value){
        return this.set(key, JSON.stringify(value))
    };

    Static.getJSON = async function(key){
        return new Promise((resolve, reject)=>{
            client.get(key, (err, data)=> {
                if(err) return reject(err);
                resolve(JSON.parse(data));
            });
        });
    };

    Static.getKEYS = async function(key){
        return new Promise((resolve,reject)=>{
            client.keys(key,(err,keyList)=>{
                if(err) return reject(err);
                resolve(keyList);
            });
        });
    };

    Static.delKEY = async function (key) {
        return new Promise((resolve, reject) => {
            client.del(key, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    };

    Static.pushData = async function (key,data) {
         return client.lpush(key, JSON.stringify(data));
     };

     Static.setData = async function (key,data) {
        return client.set(key, data);
    };

    Static.getData = async function (key) {
        return new Promise((resolve, reject) => {
            client.get(key,(err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    };


     Static.pushFlag = async function (key,data) {
        return me.lPush(key, data);
    };

     Static.lPush = function(key, data){
        return client.lpush(key, data);
     };

     Static.BLPopListner = async function(key, cb){
        async function next() {
            console.log("next called", key)
            client.blpop(key, 0, async (err, data)=>{
                console.log(data)
                if(err) return console.error(err);
                await cb(data[1]);
                next();
            });
        }
        next();
     };

    Static.popData = async function (key) {
        return new Promise((resolve, reject) => {
            client.lrange(key, 0, -1, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    };
});