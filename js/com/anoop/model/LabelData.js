fm.Package("com.anoop.model");
const LabelModel = require('../../../../models/labelData');

fm.Class("LabelData>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.findOneAndUpdate = async function (query, update={}) {
        return await LabelModel.findOneAndUpdate(query, update, { upsert: true }).exec();
    };

    Static.getByNames = async function(labels) {
        return await LabelModel.find({label_name: {$in: labels}}).lean().exec();
    };

});
