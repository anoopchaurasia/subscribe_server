fm.Package("com.anoop.vendor");

fm.Class("Redis", function (me) {
    this.setMe = _me => me = _me;
    let client;
    Static.main = function () {
        client = require('redis').createClient({ host: process.env.IMAP_REDIS_HOST });
        // client.on("error", function (err) {
        //     console.error("Error " + err);
        // });
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

    Static.setExpire = async function (key) {
        console.log(key)
        return client.expire(key, process.env.EXPIRE_TIME_IN_SECOND || 1800);
    }

    Static.setData = async function (key, data) {
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
        console.log(key, data);
        return client.lpush(key, data);
    };

    Static.BLPopListner = async function (key, cb) {
        // blpop block entire client for create new client
        let client = require('redis').createClient({ host: process.env.IMAP_REDIS_HOST });
        async function next() {
            console.log("getting next");
            client.blpop(key, 0, async (err, data) => {
                if (err) {
                    console.error(err);
                    return next()
                }
                try {
                    await cb(data);
                } catch (e) {
                    console.error(e)
                } finally {
                    next();
                }
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
            client.blpop('new_imap_user', 0, function (err, data) {
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