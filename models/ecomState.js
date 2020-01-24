var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var EcomState = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    is_flipkart: {
        type: Boolean
    },
    is_amazon: {
        type: Boolean
    },
    is_snapdeal: {
        type: Boolean
    },
    is_paytm: {
        type: Boolean
    },
    is_swiggy: {
        type: Boolean
    },
    is_zomato: {
        type: Boolean
    },
    is_ola: {
        type: Boolean
    },
    is_uber: {
        type: Boolean
    },
    flipkart_cnt: {
        type: Number
    },
    amazon_cnt: {
        type: Number
    },
});

EcomState.index({ user_id: 1});
module.exports = mongoose.model('EcomState', EcomState);
