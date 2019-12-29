'use strict';
require("dotenv").config();
require("jsfm");
fm.basedir = process.cwd() + "/js";
global.basedir = process.cwd();
global.INVALID_LOGIN_REGEX = /user left system|Application-specific password|Please log in via your web|Invalid credentials|Web login required|Invalid login or password|Authentication failed|enabled for IMAP use/i
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://7f6ed7e0c6854fb5b844256ee24540a6@sentry.expensebit.com/21' })
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_SERVER, { useNewUrlParser: true });
let on_connect;
mongoose.connection.once('connected', function () {
  if (typeof on_connect == 'function') {
    on_connect();
  } else {
    on_connect = true;
  }
  console.log("Connected to database")
});
Array.prototype.asynForEach = async function (cb) {
  for (let i = 0, len = this.length; i < len; i++) {
    await cb(this[i]);
  }
}

Array.prototype.asyncForEach = async function (cb) {
  for (let i = 0, len = this.length; i < len; i++) {
    await cb(this[i]);
  }
}

  exports.on_db_connection = function(cb){
    if(on_connect==true) {
        return cb();
    }
    on_connect = cb;
  };
if(process.env.NODE_ENV=="production") {
  process.on('SIGINT', function() {
      console.log("shuting server in 30 secs")
    setTimeout(x=>{
        console.log("shut server");
        process.exit(1);
    }, 30*1000);
 });
}
