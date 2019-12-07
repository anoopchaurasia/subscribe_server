'use strict'
require("dotenv").config();
require("jsfm");
fm.basedir = process.cwd() + "/js";
global.basedir = process.cwd();

var Raven = require('raven');
Raven.config(process.env.SENTRY_URL || 'https://edb20d0741384f7e8ef743a5a22659d5@sentry.expensebit.com/13').install();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_SERVER, {useNewUrlParser: true});
let on_connect;
mongoose.connection.once('connected', function () {
    if(typeof on_connect=='function'){
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

