fm.Package("com.anoop.model");
const mongodomain = require('../../../../models/domain');
fm.Class("Domain>.BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.get = async function(){
        return domainList.map(x=>x.domain_name);
    };

    let domainList;
    Static.main =async function(){
        domainList =  await mongodomain.find({},{domain_name:1,_id:0}).exec();
    }

});