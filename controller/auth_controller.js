'use strict'
const express = require('express');
const AppVersionModel = require('../models/appVersion');
const router = express.Router();
/*
This is the Login api. 
Using This api use can logged-in into system.
====
This api will get code/authentication code from application and using that application
code extracting token and user data. and saving and updating into database.
*/
let public_refresh_key = require("fs").readFileSync(global.basedir+"/"+ process.env.JWT_REFRESH_TOKEN_SECRET_FILE+"public.pem");

let jwt = require("jsonwebtoken");
fm.Include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;
router.get('/getAppVersion', async (req, res) => {
    try {
        let versionData = await AppVersionModel.findOne().sort({ version_name: -1 }).limit(1).catch(err => {
            console.error(err.message, err.stack);
        });
        if(versionData){
            res.status(200).json({
                message: "success",
                version: versionData.version_name
            })
        }else{
            res.status(404).json({
                message: "failed"
                        })
        }
        
    } catch (ex) {
        console.error(ex.message, ex.stack);
    }
});

router.get("/refreshToken", async (req, res)=>{
    jwt.verify(req.query.refresh_token, public_refresh_key, {algorithms: ['RS256']}, async (err, data) => {
        if (err) {
            console.error(err.message,err.stack,'jwtTokenVerify');
            res.status(401).json({
                error: true,
                msg: "unauthorised user"
            });
        } else {
            let {user_id, email} = data;
            res.json({token: await BaseController.TokenModel.generateJWTToken({user_id, email}), error: false });
        }
    })
});

module.exports = router
