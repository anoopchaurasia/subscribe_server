fm.Package("com.anoop.imap");
var legit = require('legit');
var crypto = require('crypto');
const Imap = require('imap');
var randomstring = require("randomstring");
fm.Class("MyImap", function (me) {
    this.setMe = _me => me = _me;
    this.init = function () {
        Static.Const.PASSWORD_ENCRYPT_ALGO = process.env.PASSWORD_ENCRYPT_ALGO || "aes256";
        Static.Const.PASSWORD_ENCRYPT_KEY = process.env.PASSWORD_ENCRYPT_KEY || "donnottrytodecryptthisone";
    }
    this.MyImap = function (user, provider) {
        this.imap = null;
        this.user = user;
        this.provider = provider;
    };

    Static.getProvider = async function (email) {
        const response = await legit(email);
        if (response.isValid) {
            let mxr = response.mxArray[0].exchange;
            if (mxr.includes("zoho")) {
                return "imappro.zoho.com";
            }
            else if (mxr.includes("yahoo")) {
                return "imap.mail.yahoo.com";
            } else if (mxr.includes("google")) {
                return "imap.gmail.com";
            }
        }
    }

    Static.encryptPassword = function (password) {
        var new_password = randomstring.generate(8).toLowerCase() + password.substring(0, 3) + randomstring.generate(4).toLowerCase() + password.substring(3, password.length) + randomstring.generate(6).toLowerCase();
        var cipher = crypto.createCipher(me.PASSWORD_ENCRYPT_ALGO, me.PASSWORD_ENCRYPT_KEY);
        return cipher.update(new_password, 'utf8', 'hex') + cipher.final('hex');
    };

    Static.decryptPassword = function (password) {
        var decipher = crypto.createDecipher(me.PASSWORD_ENCRYPT_ALGO, me.PASSWORD_ENCRYPT_KEY);
        var decrypted = decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
        var remove_padding = decrypted.slice(8, decrypted.length - 6)
        return remove_padding.substring(0, 3) + remove_padding.substring(7, remove_padding.length);
    };

    this.getLabels = async function () {
        return new Promise((resolve, reject) => {
            me.imap.getBoxes(function (err, boxes) {
                let names = [];
                Object.keys(boxes).sort().forEach(boxName => {
                    names.push(boxName);
                    const box = boxes[boxName];
                    if (box.children) {
                        Object.keys(box.children).sort().forEach(childName => {
                            names.push(`${boxName}${box.delimiter}${childName}`);
                        });
                    }
                });
                (err ? reject(err) : resolve(names));
            });
        });
    };

    this.createlabel = async function (label_name) {
        return new Promise((resolve, reject) => {
            me.imap.addBox(label_name, function (err, box) {
                (err ? reject(err) : resolve(box));
            })
        });
    };


    this.openFolder = async function (folder) {
        return new Promise((resolve, reject) => {
            me.imap.openBox(folder, false, function (err, box) {
                (err ? reject(err) : resolve(box));
            });
        });
    }

    this.closeFolder = async function () {
        return new Promise((resolve, reject) => {
            me.imap.closeBox(true, function (err, box) {
                (err ? reject(err) : resolve(box));
            });
        });
    }

    this.connect = async function (provider) {
        let { password, email } = me.user;
        let original_password = me.decryptPassword(password);
        return new Promise((resolve, reject) => {
            me.imap = new Imap({
                user: email,
                password: original_password,
                host: provider.imap_host,
                port: provider.port,
                tls: true,
                ssl: true
            });
            me.imap.once('ready', async () => {
                resolve(me.imap);
            });
            me.imap.once('error', err => reject(err));
            me.imap.connect();
        })
    };
});