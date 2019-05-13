var mongoose = require('mongoose')
    , Schema = mongoose.Schema


var emaildetail = new Schema({
    from_email: {
        type: String,
        index: true,
    },
    from_email_name: {
        type: String,
    },
    user_id: { type: Schema.Types.ObjectId, ref: 'UserImap', index: true },
    status: {
        type: "String",
        index: true
    },
    status_date: {
        type: Date
    }
  });
emaildetail.index({ from_email: 1, user_id: 1 });
emaildetail.index({ status: 1, user_id: 1 }); // schema level
var userdata = mongoose.model('EmailDetailImap', emaildetail);
module.exports = userdata;
