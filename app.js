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



const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
  
app.use('/api/v2/mail', require('./routes/router'));
app.use('/api/v1/mail', require('./routes/router'));
app.get('/api/v2/setToken', function (req, res) {
    console.log(req)
})




app.get('/', function (req, res) {
    console.log(req)
    res.send("welcome!!!!!!!!");
})

app.listen(process.env.SERVER_PORT, function (err) {
    if (err) {
        throw err
    }
    console.log('Server started on port', process.env.SERVER_PORT)
})

require("./helper/process_email_update");