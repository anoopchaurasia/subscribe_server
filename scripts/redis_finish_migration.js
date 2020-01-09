'use strict'
require("jsfm");
fm.basedir = __dirname + "/../js";
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.email.BaseController");
async function aa(){
    let keys = await RedisDB.getKEYS("is_finished*");
    console.log(keys)
    await RedisDB.delKEY(keys);
    keys.forEach(x=>{
        RedisDB.base.setExpire(x, 5*60);
    });
}

aa();