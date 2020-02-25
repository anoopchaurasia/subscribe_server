'use strict';
require("dotenv").config({"path":".listner_env"});
require("./base.js");
setTimeout(x=> {
    global.listner_key = require("fs").readFileSync(`${process.env.HOME}/app/key/listner_key`).toString();
    require("./helper/imap_listner");
}, 30*1000)
