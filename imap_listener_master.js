'use strict'
require("dotenv").config({
  "path": ".listner_env"
});
require("dotenv").config();
require("jsfm");
fm.basedir = process.cwd() + "/js";
global.basedir = process.cwd();

var Raven = require('raven');
Raven.config('https://edb20d0741384f7e8ef743a5a22659d5@sentry.expensebit.com/13').install();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_SERVER, {
  useNewUrlParser: true
});
mongoose.connection.once('connected', function () {
  console.log("Connected to database")
  setTimeout(x => {
    onNewUser();
    runJob();
  }, 10 * 1000);
  setInterval(new_user_check, 2*60*1000);
});


'use strict'
const UserModel = require('./models/user');
fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let RedisDB = com.jeet.memdb.RedisDB;
Array.prototype.asynForEach = async function (cb) {
  for (let i = 0, len = this.length; i < len; i++) {
    await cb(this[i]);
  }
}

let LISTEN_USER_KEY = "listen_for_user";

async function runJob(offset = 0) {
  RedisDB.delKEY(LISTEN_USER_KEY);
  console.log("scheduler called for scrapping mail for imap...");
  let counter = offset;
  const cursor = await UserModel.find({
    "email_client": "imap"
  }, {
    _id: 1
  }).skip(offset).lean().cursor();
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


function new_user_check(){
  let cursor = UserModel.find({listener_active: null, email_client:"imap"}, {_id:1}).lean().cursor();
  cursor.eachAsync(async user => {
    RedisDB.notifyListner( user._id.toHexString());
  }).catch(async e => {
    console.error("watch error", counter, e);
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