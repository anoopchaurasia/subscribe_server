const mongoose = require('mongoose');

const labelData = new mongoose.Schema({
    label_name: {
        type: String
    },
    provider: {
        type: String
    },
    is_trash: {
        type: Boolean
    }
})

module.exports = mongoose.model('LabelData', labelData)
