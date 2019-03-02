var express = require('express');
var router = express.Router();
let token_model = require('../models/token');

router.use('/auth', require('../controller/auth_controller'));
router.use('/email', check_auth,require('../controller/email_controller'));
router.use('/pubsub', check_auth, require('../controller/pubsub_controller'));
router.use('/users', check_auth, require('../controller/user_controller'));

module.exports = router;

async function check_auth(req, res, next){
    let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
        console.log(err);
    });
    if(!doc)  {
        return res.write("auth failed");
    }
    req.token = doc;
    next();
}