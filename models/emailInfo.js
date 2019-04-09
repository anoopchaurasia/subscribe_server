var mongoose = require('mongoose')
    , mongoosastic = require('mongoosastic')
    , Schema = mongoose.Schema


var emailInfo = new Schema({
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
    subject: {
        type: String,
        es_indexed: false,
        index: true
    },
    unsubscribe: {
        type: String,
        es_indexed: false
    },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
   });

emailInfo.plugin(mongoosastic, {
    host: "test.expensebit.com",
    port: 9213
})

var emailInfo = mongoose.model('EmailInfo', emailInfo);
module.exports = emailInfo;
