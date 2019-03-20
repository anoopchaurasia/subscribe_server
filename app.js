'use strict'
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
// var callIndex = require('./index.js');
let mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/subscribe_development");
mongoose.connection.once('connected', function () {
    console.log("Connected to database")
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/api/v1/mail', require('./routes/router'));

app.get('/api/v1/setToken', function (req, res) {
    console.log(req)
})


app.get('/', function (req, res) {
    res.send("welcome to express");
})


app.listen(8080, function (err) {
    if (err) {
        throw err
    }
    console.log('Server started on port 8080')
})

<<<<<<< Updated upstream


=======
>>>>>>> Stashed changes
