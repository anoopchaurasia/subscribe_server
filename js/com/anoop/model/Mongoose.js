fm.Package("com.anoop.model");
fm.AbstractClass("Mongoose", function (me) {
    this.setMe = (_me) => me = _me;

    this.init = function () {
        Static.Const.transient = ["subInstace"];
        let mongoose = require("mongoose");
        mongoose.set('useCreateIndex', true);
        Static.Const.getMongoose = () => mongoose;
        
        Static.disconnect = async x=>{
           return mongoose.connection.close();
        };

        Static.Schema = function (obj, modelname) {
            let schema = new mongoose.Schema(obj);
            let model = mongoose.model(modelname, schema);
            return {
                schema,
                model
            }
        };
    };


    this.Mongoose = function () {
        this.subInstace = this.getSub();
    };

    Static.esQuery = function (query, cb, klass, key) {
        klass.getModel().esSearch(query, { hydrate: true }, function(err, results){
            if (err) return cb({ [key]: [], total: 0})
            cb({ [key]: results.hits.hits.filter(x => x && x._doc).map(x => x._doc), total: results.hits.total});
        });
    };
});