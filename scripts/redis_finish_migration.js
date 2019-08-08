'use strict'
require("jsfm");
fm.basedir = __dirname + "/../js";
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;
async function aa(){
    let keys = await RedisDB.getKEYS("is_finished*");
    console.log(keys)
    console.log(await BaseController.isScanFinished("454545")===null)
    await RedisDB.delKEY(keys);
    keys.forEach(x=>{
        RedisDB.set(x, true);
    });
}

aa();