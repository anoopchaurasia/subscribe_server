var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var Provider = new Schema({
    domain_name: {
        type: String
    },
    mx_record: {
        type: String
    },
    provider: {
        type: String
    },
    login_url:{
        type: String
    },
    two_step_url:{
        type: String
    },
    imap_enable_url:{
        type: String
    },
    imap_host:{
        type: String
    },
    port:{
        type:Number
    },
    explain_url:{
        type:String
    },
    video_url:{
        type:String
    },
    login_js:{
        type:String
    }
});


module.exports = mongoose.model('Provider', Provider);
