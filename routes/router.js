var express = require('express');
var router = express.Router();
let token_model = require("../models/tokeno");
require('dotenv').config();
var cookieParser = require('cookie-parser')

const jwt = require('jsonwebtoken')
router.use(cookieParser())

router.use('/webapp/auth',require('../controller/auth_controller'));
router.use('/webapp/email',jwtTokenVerify, require('../controller/email_controller'));
router.use('/webapp/users', jwtTokenVerify, require('../controller/user_controller'));
router.use('/webapp/microsoft', require('../controller/microsoft_web_controller'));
router.use('/auth', require('../controller/auth_controller'));
router.use('/email', authenticate, require('../controller/email_controller'));
router.use('/users', authenticate, require('../controller/user_controller'));
router.use('/microsoft', require('../controller/microsoft_auth'));
router.use('/imap', require('../controller/imap_controller'));
router.use('/auth/imap', require('../controller/imap_controller_with_auth'));
router.use('/webapp/imap', require('../controller/imap_web_controller'));
router.use('/webapp/auth/imap',jwtTokenVerify, require('../controller/imap_web_controller_with_auth'));

async function authenticate(req, res, next) {
    let doc = await token_model.findOne({ "token": req.body.authID }).catch(err => {
        console.error(err.message);
    });
    if (!doc) {
        return res.write({ error: "auth failed" });
    }
    req.token = doc;
    next();
};

async function jwtTokenVerify(req, res, next) {
    let token = req.headers["x-auth-token"] || req.headers['authorization'];
    if(token.startsWith('Bearer ')){
        token = token.split(' ')[1];
    }
    if (!token) {
        res.status(403).json({ error: true, msg: 'token required' });
    }
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, data) => {
        if (err) {
            console.error(err.message,err.stack,'jwtTokenVerify');
            res.status(401).json({
                error: true,
                msg: "unauthorised user"
            });
        } else {
            req.token = data;
        }
        next();
    })
}

module.exports = router;