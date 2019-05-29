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
});