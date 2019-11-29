'use strict'
require("dotenv").config({"path":".listner_env"});
require("dotenv").config();
require("jsfm");
fm.basedir = process.cwd() + "/js";
global.basedir = process.cwd();

var Raven = require('raven');
Raven.config('https://edb20d0741384f7e8ef743a5a22659d5@sentry.expensebit.com/13').install();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_SERVER, {useNewUrlParser: true});
mongoose.connection.once('connected', function () {
    startMIgration()
});

async function startMIgration(){
    let domainModel = require("./../models/domain");
    let domainlist = require("fs").readFileSync("./data/domains.tsv").toString().replace(/\r/gim, "").split("\n").map(x=>x.split("\t"));
    let head = domainlist.shift();
    console.log(head)
    head = head.map(x=> {
        if(x==="company") return x;
        if(x==="domain") return "domain_name";
        throw new Error("no supported name"+x, head);
    })
    let domain_name_list =[];
    domainlist = domainlist.map(x=>{
        let new_x={};
        head.forEach((y,i)=>{
            new_x[y] = x[i];
        })
        new_x.domain_name.toLowerCase();
        if(!new_x.domain_name.match(/@/)) {
            new_x.domain_name = "@"+new_x.domain_name;
        }
        if(new_x.domain_name && new_x.domain_name.match(/@|\./g).length>=2 && new_x.domain_name.match(/[a-z]/g).length>=3) {
            domain_name_list.push(new_x.domain_name);
        } else {
            console.error("non supported list", new_x)
            return ;
        }
        new_x.disabled = false;
        return new_x;
    }).filter(x=>x);


    await domainModel.remove({}).exec();
    await domainModel.insertMany(domainlist);
    console.log("done")
}

