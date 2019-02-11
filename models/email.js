var mongoose = require('mongoose')
    , mongoosastic = require('mongoosastic')
    , Schema = mongoose.Schema


var email = new Schema({
    email_id: {
        type: String,
        es_indexed: false
    },
    historyId: {
        type: String,
        es_indexed: false
    },
    labelIds: {
        type: String,
        es_indexed: true
    },
    subject: {
        type: String,
        es_indexed: false
    },
    from_email: {
        type: String,
        es_indexed: true
    },
    from_email_name: {
        type: String,
        es_indexed: true
    },
    to_email: {
        type: String,
        es_indexed: false
    },
    mail_data: {
        type: Object,
        es_indexed: false
    },
    unsubscribe: {
        type: String,
        es_indexed: false
    },
    user_id: {
        type: String
    },
    is_moved: {
        type: Boolean,
        default: false
    },
    is_delete:{
        type:Boolean,
        default:false
    },
    main_label:{
        type:Array
    },
    is_keeped:{
        type:Boolean,
        default:false
    },
    is_trash:{
        type:Boolean,
        default:false
    }
});

email.plugin(mongoosastic, {
    host: "test.expensebit.com",
    port: 9213
})

var userdata = mongoose.model('EmailData', email);
module.exports = userdata;
