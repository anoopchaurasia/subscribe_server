'use strict';
require("dotenv").config({"path":".listner_env"});
require("./base.js");
global.listner_key = require("fs").readFileSync(`${process.env.HOME}/key/listner_key`).toString();
require("./helper/imap_listner");