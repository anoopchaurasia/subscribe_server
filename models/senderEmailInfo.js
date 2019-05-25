var mongoose = require('mongoose')
    , Schema = mongoose.Schema


var senderemail = new Schema({
    labelIds: {
        type: Array,
        index: true
    },
    from_email: {
        type: String,
        index: true,
    },
    from_email_name: {
        type: String,
    },
    to_email: {
        type: String,
    },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
        type: "String",
        index: true
    },
    status_date: {
        type: Date
    },
    main_label: {
        type: Array
    },
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
    mail_data: {
        type: Object,
    },
});
senderemail.index({ from_email: 1, user_id: 1 });
senderemail.index({ status: 1, user_id: 1 }); // schema level
var userdata = mongoose.model('SenderEmailInfo', senderemail);
module.exports = userdata;
