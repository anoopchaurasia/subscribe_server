fm.Package("com.anoop.model");
const mongodomain = require('../../../../models/domain');
fm.Class("Domain>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.match = function(email){
        return !!(email || "").match(domainListReg);
    };

    let domainListReg;
    Static.main =async function(){
        console.log("dfdfdfd")
        loadFromDB();
        ///load data every 30 mins;
        setInterval(loadFromDB, process.env.LOAD_DOMAIN_DB_INTERVAL || 30*60*1000);
    }

    async function loadFromDB(){
        let temp = await mongodomain.find({disabled: {$ne: true}},{domain_name:1,_id:0}).lean().exec();
        temp = temp.map(x=>x.domain_name);
        domainListReg = new RegExp(temp.join("|"), 'i');
    }
});