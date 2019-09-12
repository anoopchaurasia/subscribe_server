var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var loginAnalyticSchema = new Schema({
    device_id: {
        type: Schema.Types.ObjectId,
        ref: 'DeviceInfo',
        index: true
    },
    email_id: {
        type: String
    },
    two_step_login: {
        type: Boolean
    },
    app_pass_login: {
        type: Boolean
    },
    app_pass_generated: {
        type: Boolean
    },
    app_pass_copied: {
        type: Boolean
    },
    imap_enabled: {
        type: Boolean
    },
    mismatch_login: {
        type: Boolean
    },
    uname_pass_try: {
        type: Boolean
    },
    uname_pass_success: {
        type: Boolean
    },
    login_success: {
        type: Boolean
    },
    Go_back_from_gmail_login_flow: {
        type: Boolean
    },
    Invalid_Credentials_other_error: {
        type: Boolean
    },
    lost_in_two_step_page: {
        type: Boolean
    },
    lost_in_app_pass_page: {
        type: Boolean
    },
    app_pass_generated: {
        type: Boolean
    },
    two_step_turned_on: {
        type: Boolean
    },
    try_it_now_page: {
        type: Boolean
    },
    mob_verification: {
        type: Boolean
    },
    create_app_pass_page: {
        type: Boolean
    },
    clicked_onTutorial_in_loginflow: {
        type: Boolean
    },
    created_at: Date
});

module.exports = mongoose.model('LoginAnalytic', loginAnalyticSchema);

