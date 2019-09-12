const mongoose = require('mongoose');

const senderMail = new mongoose.Schema({
    user_id : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    senderMail : {
        type : String
    }
})

module.exports = mongoose.model('SenderMail',senderMail)
