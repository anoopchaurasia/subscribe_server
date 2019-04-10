var mongoose = require('mongoose')
    , mongoosastic = require('mongoosastic')
    , Schema = mongoose.Schema


var emailInfo = new Schema({
    email_id: {
        type: String,
        es_indexed: false,
        index: true,
    },
    historyId: {
        type: String,
        es_indexed: false,
        index: true
    },
    subject: {
        type: String,
        es_indexed: false,
        index: true
    },
    mail_data: {
        type: Object,
        es_indexed: false
    },
    unsubscribe: {
        type: String,
        es_indexed: false
    },
    labelIds: {
        type: Array,
        es_indexed: true,
        index: true
    },
    main_label: {
        type: Array
    },
    from_email_id: { type: Schema.Types.ObjectId, ref: 'EmailDetail', index: true },
   });

emailInfo.plugin(mongoosastic, {
    host: "test.expensebit.com",
    port: 9213
})

var emailInfo = mongoose.model('EmailInfo', emailInfo);
module.exports = emailInfo;
