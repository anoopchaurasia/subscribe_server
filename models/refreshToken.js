const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let RefreshToken = new Schema({
    refresh_token:{
        type:String
    },
    user_id:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    last_used_at:{
        type:Date
    },
    ipaddress:{
        type:String
    },
    deleted_at:{
        type:Date
    },
    count:{
        type:Number,
        default:0
    }
});

module.exports = mongoose.model('RefreshToken',RefreshToken);