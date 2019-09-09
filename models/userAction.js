var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userActionSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    last_scan_date: {
        type: Date
    },
    last_launch_date:{
        type: Date
    },
    last_unsub_date:{
        type: Date
    },
    last_keep_date:{
        type: Date
    },
    last_trash_date:{
        type: Date
    },
    last_manual_unsub_date:{
        type: Date
    },
    last_manual_trash_date:{
        type: Date
    }
});


var useractions = mongoose.model('UserAction', userActionSchema);
module.exports = useractions;
