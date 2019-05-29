var express = require('express');
var router = express.Router();
let token_model = require("../models/tokeno");

router.use('/auth', require('../controller/auth_controller'));
router.use('/email', authenticate,require('../controller/email_controller'));
router.use('/users', authenticate,require('../controller/user_controller'));

async function authenticate(req, res, next){
    let doc = await token_model.findOne({ "token": req.body.authID }).catch(err => {
        console.error(err.message);
    });
    if(!doc) {
        return res.write({error:"auth failed"});
    }
    req.token = doc;
    next();
};

module.exports = router;