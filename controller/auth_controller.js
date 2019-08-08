'use strict'
const express = require('express');
const UserModel = require('../models/user');
const axios = require("axios");
const token_model = require('../models/tokeno');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const AppVersionModel = require('../models/appVersion');
const GmailApi = require("../helper/gmailApis").GmailApis;
const router = express.Router();
const uniqid = require('uniqid');


/*
This is the Login api. 
Using This api use can logged-in into system.
====
This api will get code/authentication code from application and using that application
code extracting token and user data. and saving and updating into database.
*/
router.post('/signin', async (req, res) => {
    try {
        let app_version = req.headers['x-app-version'];
        const token = await TokenHandler.getTokenFromCode(req.body.code);
        const payload = await TokenHandler.verifyIdToken(token);
        let user = await UserModel.findOne({
            'email': payload.email
        }).catch(err => {
            console.error(err.message, err.stack, "22")
        })
        let access_token = token.tokens.access_token;
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = token.tokens;
        await GmailApi.watchapi(oauth2Client);
        if (!user) {
            let body = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=" + access_token);
            let userInfoData = body.data;
            user = await create_user(userInfoData, payload);
        }
        await TokenHandler.create_or_update(user, token.tokens, app_version);
        let response = await create_token(user);
        if (response) {
            res.status(200).json({
                error: false,
                data: response
            })
        } else {
            res.status(404).json({
                error: true
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack, "23")
        res.status(404).json({
            error: true
        });
    }
});


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

/*
This function will create authentication token for user for Authenticating api.
For every Login api call token will bew created and storing into database.
*/
async function create_token(user) {
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    var tokmodel = new token_model({
        "user_id": user._id,
        "token": token_uniqueid,
        "created_at": new Date()
    });
    await tokmodel.save().catch(err => {
        console.error(err.message, err.stack, "24");
    });
    return {
        "tokenid": token_uniqueid,
        "user": user
    };
}


/*
This function will create user with user information passed into parameters.
when login api called and user is not present then new user will be created.
*/
async function create_user(userInfoData, payload) {
    var newUser = new UserModel({
        "email": userInfoData.email || payload.email,
        "name": userInfoData.name || payload.name,
        "image_url": userInfoData.picture || payload.picture,
        "given_name": userInfoData['given_name'] ? userInfoData.given_name : "",
        "family_name": userInfoData['family_name'] ? userInfoData.family_name : "",
        "gender": userInfoData['gender'] ? userInfoData.gender : "",
        "birth_date": userInfoData['birth_date'] ? userInfoData.birth_date : "",
        "email_client": "gmail"
        // "is_logout": false
    });
    return await newUser.save().catch(err => {
        console.error(err.message, err.stack, "25");
    });
}
module.exports = router
