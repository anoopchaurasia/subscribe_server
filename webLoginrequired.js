'use strict'
require("dotenv").config({
  "path": ".listner_env"
});
let {on_db_connection} = require("./base");

on_db_connection(function () {
  console.log("Connected to database")
  setTimeout(x => {
    runJob();
  }, 10 * 1000);
});

fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
  for (let i = 0, len = this.length; i < len; i++) {
    await cb(this[i]);
  }
}
let key;
try {
  key = require("fs").readFileSync("./listner_key").toString();
} catch(e) {
  console.log("no file");
}

let LISTEN_USER_KEY = key;
require("fs").writeFileSync("./listner_key", LISTEN_USER_KEY);
console.log('new key', LISTEN_USER_KEY);
async function runJob(offset = 0) {
  console.log("scheduler called for scrapping mail for imap...");
  let counter = offset;
  const cursor = await ImapController.UserModel.getCursor({
    "email_client": "imap",
    inactive_reason: /Web login/,
    inactive_at:{$ne: null}
  }, {_id:1}, offset);
  cursor.eachAsync(async user => {
    await ImapController.updateUserById({_id: user._id}, {$set: {listener_active: false, inactive_at: null, inactive_reason: null}} );
      RedisDB.lPush(LISTEN_USER_KEY, user._id.toHexString());
      counter++;
    }).catch(async e => {
      console.error("watch error", counter, e);
      if (e.codeName == "CursorNotFound") {
        runJob(counter);
      }
    })
    .then(() => {
      console.log('done!')
    })
}