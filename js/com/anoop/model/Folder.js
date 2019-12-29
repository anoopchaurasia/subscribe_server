fm.Package('com.anoop.model')

fm.Class('Folder>.Mongoose', function(me){
    'use strict';
    this.setMe=_me=>me=_me;
    Static.model = null;
    Static.schema = null;
    Static.main = function(){
        let {schema, model}= me.Schema({
            name:String,
            last_msg_id: Number,
            user_id: { type: me.getMongoose().Types.ObjectId, ref: 'User', index: true },
        }, "Folder");
        me.schema = schema;
        me.model = model;
    };

    Static.saveFolders = function(user, folders){
        var bulk = me.model.collection.initializeOrderedBulkOp();
        folders.forEach(x=>{
            bulk.find({name: x, user_id: user._id}).upsert().update({name: x, user_id: user._id})
        });
        bulk.execute(function (error) {
            if(error) console.error(error, "while saving folders for user", user._id);
            console.log("saved folders for user", user._id);
        });
    };
});