'use strict'
require("dotenv").config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
// var callIndex = require('./index.js');
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGOOSE_SERVER_URL);
mongoose.connection.once('connected', function () {
    console.log("Connected to database")
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/api/v1/mail', require('./routes/router'));

app.listen(8080, function (err) {
    if (err) {
        throw err
    }
    console.log('Server started on port 8080')
})



