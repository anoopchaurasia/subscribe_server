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
    size_group:{
        type: Number
    },
    receivedDate:{
        type:Date
    },
    status:{
        type:String
    },
    labelIds:{
        type:Array
    },
    is_delete:{
        type:Boolean
    },
    box_name:{
        type:String
    }
});
emailsdata.index({ from_email: 1, user_id: 1,receivedDate:1});
var userdata = mongoose.model('EmailsData', emailsdata);
module.exports = userdata;
