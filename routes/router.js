var express = require('express');
var router = express.Router();
let token_model = require("../models/tokeno");
require('dotenv').config();
var cookieParser = require('cookie-parser')

router.use(cookieParser())

router.use('/auth', require('../controller/auth_controller'));
router.use('/email', authenticate, require('../controller/email_controller'));
router.use('/users', authenticate, require('../controller/user_controller'));
router.use('/microsoft', require('../controller/microsoft_auth'));
router.use('/imap', require('../controller/imap_controller'));
router.use('/webapp/imap', require('../controller/imap_web_controller'));

async function authenticate(req, res, next) {
    // console.log(req.headers['x-app-version'])
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
    let token = req.headers["X-AUTH-TOKEN"];
    if (!token) {
        res.status(403).json({ error: true, msg: 'token required' });
    }
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, data) => {
        if (err) {
            console.log(err);
            if (err.name == "TokenExpiredError") {

            }
            res.status(401).json({
                error: true,
                msg: "unauthorised user"
            });
        }
        next();
    })
}

module.exports = router;