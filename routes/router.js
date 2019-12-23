var express = require('express');
var router = express.Router();
let token_model = require("../models/tokeno");
fm.include("com.anoop.model.Token");
let Token = com.anoop.model.Token;
router.use('/auth', require('../controller/auth_controller'));
router.use('/email', authenticate,require('../controller/email_controller'));
router.use('/users', authenticate,require('../controller/user_controller'));
router.use('/microsoft', require('../controller/microsoft_auth'));
router.use('/imap', require('../controller/imap_controller')); 
async function authenticate(req, res, next){
    let token = req.body.authID || req.body.token;
    let user = Token.getUserByToken(token);
    if(!user) {
        return res.json({error:"auth failed"});
    }
    req.user = user;
    next();
};

module.exports = router;