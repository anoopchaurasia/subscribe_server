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
    clicked_on_show_subject: {
        type: Boolean
    },
    unsubscribe_clicked_from_main_list: {
        type: Boolean
    },
    delete_clicked_from_main_list: {
        type: Boolean
    },
    keep_clicked_from_main_list: {
        type: Boolean
    },
    clicked_share_btn_from_side_menu: {
        type: Boolean
    },
    clicked_multiacc_btn_from_side_menu: {
        type: Boolean
    },
    clicked_rating_btn_from_side_menu: {
        type: Boolean
    },
    clicked_statistic_btn_from_side_menu: {
        type: Boolean
    },
    clicked_settings_btn_from_side_menu: {
        type: Boolean
    },
    clicked_abtUs_btn_from_side_menu: {
        type: Boolean
    },
    clicked_trash_list_btn_from_side_menu: {
        type: Boolean
    },
    clicked_faq_btn_from_side_menu: {
        type: Boolean
    },
    clicked_unsubs_list_btn_from_side_menu: {
        type: Boolean
    },
    clicked_privacy_btn_from_side_menu: {
        type: Boolean
    },
    clicked_terms_btn_from_side_menu: {
        type: Boolean
    },
    clicked_keep_list_btn_from_side_menu: {
        type: Boolean
    },
    logout_success: {
        type: Boolean
    },
    gdpr_disconnected: {
        type: Boolean
    },
    clicked_delete_btn_from_unsub_list: {
        type: Boolean
    },
    clicked_keep_btn_from_unsub_list: {
        type: Boolean
    },
    clicked_keep_btn_from_delete_list: {
        type: Boolean
    },
    clicked_delete_btn_from_keep_list: {
        type: Boolean
    },
    clicked_unsub_btn_from_keep_list: {
        type: Boolean
    },
    clicked_delete_btn_from_manually_unsub_page: {
        type: Boolean
    },
    clicked_unsub_btn_from_manually_unsub_page: {
        type: Boolean
    },
    clicked_unsub_btn_from_subject_view:{
        type: Boolean
    },
    clicked_keep_btn_from_subject_view:{
        type:Boolean
    },
    clicked_trash_btn_from_subject_view:{
        type:Boolean
    },
    created_at: Date
});

module.exports = mongoose.model('LoginAnalytic', loginAnalyticSchema);

