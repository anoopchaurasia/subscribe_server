'use strict';
let {
    on_db_connection
} = require("../base");
fm.Include("com.anoop.model.User")
fm.Include("com.anoop.imap.Controller")
let UserModel = com.anoop.model.User;
let Controller = com.anoop.imap.Controller;
var googleTranslate = require('google-translate')(process.env.google_translate_api_key);

let completed = 0;
try {
    completed = require("fs").readFileSync("es_counter").toString() * 1;
} catch (e) {
    console.error(e.message)
}
let last_send = Date.now;
console.log("starting at", completed);
const EventEmitter = require('events').EventEmitter;
require('events').EventEmitter.defaultMaxListeners = 25
const eventEmiiter = new EventEmitter();
async function caller_function() {

    let cursor = await UserModel.getCursor({}, {}, completed);
    last_send = Date.now()
    cursor.eachAsync(async x => {
        last_send = Date.now;
        await findBoxAndCheck(x);
    });

}


async function findBoxAndCheck(x) {
    console.log(x);
    let { boxList, provider } = await Controller.getAndReturnLabel(x, "INBOX", function onDIsconect() {
        console.warn("disconnected crashing");
    })
    if (provider === "gmail") {

        if (boxList.includes('[Gmail]/Trash')) {
            // update user with '[Gmail]/Trash' trash_label
            let query = {
                _id: x._id
            };
            let set = {
                $set: { "trash_label": '[Gmail]/Trash' }
            }
            let result = await UserModel.updateUser(query, set);
            console.log("got result => ", result)
        } else if (boxList.includes('[Gmail]/Bin')) {
            // update user with '[Gmail]/Bin' trash_label
            let query = {
                _id: x._id
            };
            let set = {
                $set: { "trash_label": '[Gmail]/Bin' }
            }
            let result = await UserModel.updateUser(query, set);
            console.log("got result => ", result)
        } else {

            await boxList.asynForEach(element => {
                console.log("English :>", element);
                if (element.indexOf('[Gmail]') != -1) {
                    googleTranslate.translate(element, 'en', async function (err, translation) {
                        if (translation.translatedText.toLowerCase().indexOf('trash') != -1) {
                            console.log("Spanish :>", element, translation.translatedText);
                            let query = {
                                _id: x._id
                            };
                            let set = {
                                $set: { "trash_label": element }
                            }
                            let result = await UserModel.updateUser(query, set);
                            return
                        } else if (translation.translatedText.toLowerCase().indexOf('bin') != -1) {
                            console.log("Spanish :>", element, translation.translatedText);
                            let query = {
                                _id: x._id
                            };
                            let set = {
                                $set: { "trash_label": element }
                            }
                            let result = await UserModel.updateUser(query, set);
                            return
                        }
                    });
                }
            });
        }
    }
    console.log(boxList, provider);
}

let pending = ["senddata1", "senddata2", "senddata3"];
let list = [];
eventEmiiter.on("senddata1", function () {
    pending.push("senddata1");
});
eventEmiiter.on("senddata2", function () {
    pending.push("senddata2");
});
eventEmiiter.on("senddata3", function () {
    pending.push("senddata3");
});


let start = Date.now();
let start_c = completed;

on_db_connection(function () {
    caller_function();
});
setInterval(x => {
    if ((Date.now - last_send) > 60 * 1000) {
        console.error("no action for last 60 seconds")
        return process.exit(345);
    }
    console.log("saving counter", completed / 100000, (completed - start_c) / 100000, Date.now() - start);
    require("fs").writeFileSync("es_counter", completed);
}, 5 * 1000);
async function storeData(arr, type) {
    console.log("saved", type, arr.length);
    arr.length && (await EmailData.bulkSave(arr));
    completed += arr.length
    type && eventEmiiter.emit(type);
}