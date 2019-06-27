var mongoose = require('mongoose')
    , Schema = mongoose.Schema


var emailInfo = new Schema({
    email_id: {
        type: String,
        index: true,
    },
    historyId: {
        type: String,
        index: true
    },
    subject: {
        type: String,
        index: true
    },
    msg_uid: {
        type: String,
        index: true,
    },
    mail_data: {
        type: Object,
    },
    unsubscribe: {
        type: String,
    },
    labelIds: {
        type: Array,
        index: true
    },
    main_label: {
        type: Array
    },
    from_email_id: { type: Schema.Types.ObjectId, ref: 'EmailDetail', index: true },
   });


var emailInfo = mongoose.model('EmailInfo', emailInfo);
module.exports = emailInfo;
