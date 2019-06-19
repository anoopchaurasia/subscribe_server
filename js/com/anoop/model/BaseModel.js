fm.Package("com.anoop.model");
fm.Class("BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.updateQueryValidation = function(query){
        if(!(query._id || query.user_id)) throw new Error("_id or user id require for update");
    };
});