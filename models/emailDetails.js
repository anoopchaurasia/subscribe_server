var mongoose = require('mongoose')
    , mongoosastic = require('mongoosastic')
    , Schema = mongoose.Schema


var emaildetail = new Schema({
    email_id: {
        type: String,
        es_indexed: false,
        index: true
    },
    labelIds: {
        type: String,
        es_indexed: true,
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
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
        type:"String",
        index: true
    },
    status_date:{
        type: Date
    },
    main_label:{
        type:Array
    }
});

emaildetail.plugin(mongoosastic, {
    host: "test.expensebit.com",
    port: 9213
})

var userdata = mongoose.model('EmailDetail', emaildetail);
module.exports = userdata;
