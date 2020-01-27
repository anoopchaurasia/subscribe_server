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
    deleted_at:{
        type:Date
    },
    box_name:{
        type:String
    }
});

var userdata = mongoose.model('EmailsData', emailsdata);
module.exports = userdata;
