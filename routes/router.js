var express = require('express');
var router = express.Router();
fm.include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;
router.use('/auth', noauth,require('../controller/auth_controller'));
router.use('/email', authenticate,require('../controller/email_controller'));
router.use('/users', authenticate,require('../controller/user_controller'));
router.use('/microsoft', noauth,require('../controller/microsoft_auth'));
router.use('/microsoft',authenticate,require('../controller/microsoft_auth_controller'));
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
    if(req.user) {
        return next();
    }
    let token = req.headers["X-AUTH-TOKEN"] || req.headers["x-auth-token"] || req.body.authID || req.body.token;
    
    if(!token) {
        let data;
        if((data=await jwt_login(req).catch(err=>{ console.error(err.message); res.end(); }) ) ) {
            req.user = await BaseController.UserModel.getRedisUser(data.user_id);
            return next();
        }
        return res.status(401).json({error:"auth failed"});
    }
    if(token.startsWith('Bearer ')){
        token = token.split(' ')[1];
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

async function jwt_login (req) {
    let token = req.headers['authorization'];
    if (!token) {
        throw new Error("no token available");
    }
    if(token.startsWith('Bearer ')){
        token = token.split(' ')[1];
    }
    return await jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET_KEY);
 }

module.exports = router;