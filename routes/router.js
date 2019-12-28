var express = require('express');
var router = express.Router();
fm.include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;
router.use('/auth', noauth,require('../controller/auth_controller'));
router.use('/email', authenticate,require('../controller/email_controller'));
router.use('/users', authenticate,require('../controller/user_controller'));
router.use('/microsoft', noauth,require('../controller/microsoft_auth'));
router.use('/imap', noauth, require('../controller/imap_controller')); 
router.use('/imap', authenticate, require('../controller/imap_controller_auth')); 
router.use('/imap', authenticate, require('../controller/imap_action_controller')); 
router.use('/imap', authenticate, require('../controller/imap_quick_clean_controller')); 
let jwt = require("jsonwebtoken");
async function noauth(req, res, next){
    BaseController.sendToAppsFlyer("temp@temp.com", req.originalUrl.split("/").join("_"));
    next();
}

async function authenticate(req, res, next){
    let token = req.body.authID || req.body.token;
    if(!token && jwt_login(req, res)) {
        return;
    }
    let user = await BaseController.TokenModel.getUserByToken(token);
    if(!user) {
        BaseController.sendToAppsFlyer("nolog", req.originalUrl.split("/").join("_"))
        console.error("auth failed for token", token, req.originalUrl);
        return res.json({error:"auth failed"});
    }
    BaseController.sendToAppsFlyer(user.email, req.originalUrl.split("/").join("_"));
    req.user = user;
    next();
}

async function jwt_login (req, res, next) {
    let token = req.headers["x-auth-token"] || req.headers['authorization'];
    if (!token) {
        return false;
    }
    if(token.startsWith('Bearer ')){
        token = token.split(' ')[1];
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
    return true;
}

module.exports = router;