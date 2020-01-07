'use strict'
require("dotenv").config({
  "path": ".listner_env"
});
let {on_db_connection} = require("./base");

on_db_connection(function () {
  console.log("Connected to database")
  setTimeout(x => {
    onNewUser();
    runJob();
  }, 10 * 1000);
  setInterval(new_user_check, 2*60*1000);
});

fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
  for (let i = 0, len = this.length; i < len; i++) {
    await cb(this[i]);
  }
}
let oldkey;
try {
  oldkey = require("fs").readFileSync("./listner_key").toString();
} catch(e) {
  console.log("no file");
}

let key = Math.random().toString(36).slice(2);
let LISTEN_USER_KEY = process.env.LISTNER_EVENT_NAME+key;
require("fs").writeFileSync("./listner_key", LISTEN_USER_KEY);
console.log('new key', LISTEN_USER_KEY);
async function runJob(offset = 0) {
  RedisDB.delKEY(LISTEN_USER_KEY);
  oldkey && RedisDB.delKEY(oldkey);
  console.log("scheduler called for scrapping mail for imap...");
  let counter = offset;
  const cursor = await ImapController.UserModel.getCursor({
    "email_client": "imap"
  }, {_id:1}, offset);
  cursor.eachAsync(async user => {
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
};


async function new_user_check(){
  if(await RedisDB.listLength(LISTEN_USER_KEY)>0) {
    console.warn("processing old users returning")
    return;
  }
  let cursor = await ImapController.UserModel.getCursor({listener_active: null, inactive_at: null, email_client:"imap"},
  {_id:1})
    cursor.eachAsync(async user => {
    RedisDB.notifyListner( user._id.toHexString());
  }).catch(async e => {
    console.error("watch error", e);
  })
  .then(() => {
    console.log('done!')
  })
}

function onNewUser() {
  ImapController.onNewUser(async x => {
    let user = await ImapController.getUserById(x);
    console.log("new user added", user);
    if (user.listener_active && user.inactive_at == null) {
      return false;
    }
    RedisDB.lPush(LISTEN_USER_KEY, user._id.toHexString());
    console.log("setting for new user", user._id);
  });
}

setInterval(async x=>{
  let keys = await RedisDB.base.getKEYS(LISTEN_USER_KEY+"_*");
  let total = 0;
  await keys.asynForEach(async k=>{
    let c= await RedisDB.base.getData(k);
    total+= c*1;
    console.log("instance serving",k, c, total);
  })
  console.log("total serving", total);
}, 60*1000);