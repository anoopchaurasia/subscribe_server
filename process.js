'use strict'
require("dotenv").config();
require("jsfm");
fm.basedir = process.cwd() + "/js";
global.basedir = process.cwd();

var Raven = require('raven');
Raven.config('https://edb20d0741384f7e8ef743a5a22659d5@sentry.expensebit.com/13').install();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_SERVER, {useNewUrlParser: true});
mongoose.connection.once('connected', function () {
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
require("./helper/process_email_update");
require("./helper/process_user_login");
