const mongoose = require('mongoose');

const labelData = new mongoose.Schema({
    label_name: {
        type: String,
        index: true
    },
    provider: {
        index: true,
        type: String
    },
    en_name: {
        index: true,
        type: String
    }
})

module.exports = mongoose.model('LabelData', labelData)
