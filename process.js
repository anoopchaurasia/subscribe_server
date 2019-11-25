'use strict'
require("dotenv").config();
require("jsfm");
fm.basedir = process.cwd() + "/js";
global.basedir = process.cwd();

const express = require('express');
const bodyParser = require('body-parser');
var Raven = require('raven');
Raven.config('https://edb20d0741384f7e8ef743a5a22659d5@sentry.expensebit.com/13').install();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_SERVER, {useNewUrlParser: true});
mongoose.connection.once('connected', function () {
    console.log("Connected to database")
});
require("./helper/process_email_update");
///require("./helper/process_user_login");
