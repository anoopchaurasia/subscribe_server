fm.Package("com.anoop.model");
fm.Class("BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.updateQueryValidation = function(query, custome_key){
        if(!(query._id || query.user_id || query[custome_key])) throw new Error("_id or user id require for update");
    };
});