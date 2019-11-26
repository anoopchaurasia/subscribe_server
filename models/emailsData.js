var mongoose = require('mongoose')
    , Schema = mongoose.Schema


var emailsdata = new Schema({
    from_email: {
        type: String,
        index: true,
    },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    subject:{
        type: String
    },
    email_id:{
        type:String
    },
    size:{
        type:String
    },
    receivedDate:{
        type:Date
    },
    status:{
        type:String
    },
    labelIds:{
        type:Array
    }
});
emailsdata.index({ from_email: 1, user_id: 1,email_id:1,receivedDate:1});
var userdata = mongoose.model('EmailsData', emailsdata);
module.exports = userdata;
