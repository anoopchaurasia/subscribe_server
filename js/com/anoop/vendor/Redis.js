fm.Package("com.anoop.vendor");
fm.Class("Redis", function (me) {
    this.setMe = _me => me = _me;
    let client;
    Static.main = function () {
        client = require('redis').createClient({ host: process.env.IMAP_REDIS_HOST });
    };

    Static.getClient = () => client;
    Static.set = function (key, value) {
        return client.set(key, value);
    };

    Static.setJSON = function (key, value) {
        return this.set(key, JSON.stringify(value))
    };

    Static.getJSON = async function (key) {
        return new Promise((resolve, reject) => {
            client.get(key, (err, data) => {
                if (err) return reject(err);
                resolve(JSON.parse(data));
            });
        });
    };

    Static.getKEYS = async function (key) {
        return new Promise((resolve, reject) => {
            client.keys(key, (err, keyList) => {
                if (err) return reject(err);
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

    Static.pushData = async function (key, data) {
        return client.lpush(key, JSON.stringify(data));
    };

    Static.setExpire = async function (key, expire_time_in_seconds) {
        return client.expire(key, expire_time_in_seconds || process.env.EXPIRE_TIME_IN_SECOND || 1800);
    }

    Static.setData = async function (key, data) {
        console.log(key, "set data");
        return client.set(key, data);
    };

    Static.getData = async function (key) {
        return new Promise((resolve, reject) => {
            client.get(key, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    };

    Static.pushFlag = async function (key, data) {
        return me.lPush(key, data);
    };

    Static.lPush = function (key, data) {
        return client.lpush(key, data);
    };

    Static.lREM = function(key, value) {
        return client.lrem(key, -1, value);
    }

    let listner_count=0;
    Static.BLPopListner = async function (key, cb) {
        listner_count;
        // blpop block entire client for create new client
        let client = require('redis').createClient({ host: process.env.IMAP_REDIS_HOST });
        let shut_server = false;
        let original_key = key+"";
        key = Array.isArray(key)? key : [key];
        let start_listner_time = Date.now();
        key.push(0, async (err, data) => {
            global.sendToManager({type:"redis_pop_"+ original_key, formatter: "value", value: Date.now() - start_listner_time});
            listner_count++;
            if (err) {
                console.error(err);
                listner_count--;
                start_listner_time = Date.now();
                return next()
            }
            try {
                console.time(original_key)
                console.timeLog(original_key);
                await cb(data);
                console.timeEnd(original_key);
            } catch (e) {
                console.timeEnd(original_key);
                console.error(e, original_key, "BLPopListner")
            } finally {
                listner_count--;
                start_listner_time = Date.now();
                next();
            }
        });

        async function next() {
            if(shut_server === true) {
                if(listner_count==0) {
                    console.log("graceful shuting server");
                    process.exit(0);
                }
                return;
            }
            console.log("getting next", original_key);
            client.brpop(...key);
        }
        next();
        process.on('SIGINT', function() {
            shut_server = true;
            console.log(listner_count, "shutdown")
            if(listner_count==0) {
                console.log("graceful shuting server");
                process.exit(0);
            }
         });
    };

    Static.popData = async function (key) {
        return new Promise((resolve, reject) => {
            client.lrange(key, 0, -1, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    };

    Static.notifyListner = async function (user_id) {
        client.lpush('new_imap_user', user_id);
        client.expire("new_imap_user", 20);
    };

    Static.listLength = async function (key) {
        return new Promise((resolve, reject) => {
            client.llen(key, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    }

    Static.onNewUser = function (cb) {
        // blpop block entire client for create new client
        let client = require('redis').createClient({ host: process.env.IMAP_REDIS_HOST });
        function next() {
            client.brpop('new_imap_user', 0, function (err, data) {
                try {
                    cb(data[1]);
                } catch (e) {
                    console.log(e);
                } finally {
                    next();
                }
            });
        }
        next();
    };
});