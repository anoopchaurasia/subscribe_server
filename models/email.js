var mongoose = require('mongoose')
    , mongoosastic = require('mongoosastic')
    , Schema = mongoose.Schema


var email = new Schema({
    email_id: {
        type: String,
        es_indexed: false,
        index: true
    },
    historyId: {
        type: String,
        es_indexed: false,
        index: true
    },
    labelIds: {
        type: String,
        es_indexed: true,
        index: true
    },
    subject: {
        type: String,
        es_indexed: false,
        index: true
    },
    from_email: {
        type: String,
        es_indexed: true,
        index: true
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
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    is_moved: {
        type: Boolean,
        default: false,
        index: true
    },
    is_delete:{
        type:Boolean,
        default:false,
        index: true
    },
    main_label:{
        type:Array
    },
    is_keeped:{
        type:Boolean,
        default:false,
        index: true
    },
    is_trash:{
        type:Boolean,
        default:false,
        index: true
    }
});

email.plugin(mongoosastic, {
    host: "test.expensebit.com",
    port: 9213
})

var userdata = mongoose.model('EmailData', email);
module.exports = userdata;
