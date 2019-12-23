'use strict';
let {on_db_connection}  = require("./base");
on_db_connection(function(){
    console.log("dsdssdsd")
})
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
  
app.use('/api/v2/mail', require('./routes/router'));
app.use('/api/v1/mail', require('./routes/router'));
app.get('/api/v2/setToken', function (req, res) {
})

app.get('/', function (req, res) {
    res.send("welcome!!!!!!!!");
});

app.listen(process.env.SERVER_PORT, function (err) {
    if (err) {
        throw err
    }
    console.log('Server started on port', process.env.SERVER_PORT)
})
