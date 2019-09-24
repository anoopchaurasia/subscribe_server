fm.Package("com.anoop.model");
const SenderMail = require('../../../../models/senderMail');

fm.Class("SenderMail>.BaseModel", function (me) {
    this.setMe = _me => me = _me;

    Static.create = async function (senderMail, user_id) {
        var newSenderData = new SenderMail({
            "user_id": user_id,
            "senderMail": senderMail,
        });
        return await newSenderData.save().catch(err => {
            console.error(err.message, err.stack);
        });
    }

    Static.findOneAndUpdate = async function (query, set) {
        return await SenderMail.findOneAndUpdate(query, { $set: set }, { upsert: true }).exec();
    }
});
