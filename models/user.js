var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    user_id: {
        type: String,
        index: true
    },
    image_url: {
        type: String
    },
    given_name: {
        type: String
    },
    family_name: {
        type: String
    },
    gender: {
        type: String
    },
    birth_date: {
        type: Date
    },
    state: {
        type: String
    },
    email_client: {
        type: String,
    },
    password: {
        type: String
    },
    last_name: {
        type: String
    },
    gender: {
        type: String
    },
    trash_label: {
        type: String
    },
    last_msgId: {
        type: Number
    },
    dob: {
        type: Number
    },
    unsub_label: {
        type: String
    },
    primary_email: {
        type: String
    },
    inactive_at: {
        type: Date
    },
    ipaddress: {
        type: String
    },
    listener_active: {
        type: Boolean
    },
    platform_source: {
        type: String
    },
    inactive_reason: String
});



module.exports = mongoose.model('User', UserSchema);

