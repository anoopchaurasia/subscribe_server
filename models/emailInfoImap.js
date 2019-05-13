var mongoose = require('mongoose')
    , Schema = mongoose.Schema


var emailInfo = new Schema({
    msg_uid: {
        type: String,
        index: true,
    },
    unsubscribe: {
        type: String,
    },
    from_email_id: { type: Schema.Types.ObjectId, ref: 'EmailDetailImap', index: true },
   });


var emailInfo = mongoose.model('EmailInfoImap', emailInfo);
module.exports = emailInfo;
