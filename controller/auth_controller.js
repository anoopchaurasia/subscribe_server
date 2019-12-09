'use strict'
const express = require('express');
const UserModel = require('../models/user');
const token_model = require('../models/tokeno');
const AppVersionModel = require('../models/appVersion');
const router = express.Router();
const uniqid = require('uniqid');
const app = express();
const cookieParser = require('cookie-parser');
require('dotenv').config()
const jwt = require('jsonwebtoken')

app.use(cookieParser());


router.get('/refreshToken', verifyRefreshToken, async (req, res) => {
    let fiveHoursLater = new Date(new Date().setHours(new Date().getHours() + 5)).toString();
    res.json({
        error: false,
        status: 200,
        data: {
            token: {
                "accessToken": jwt.sign(req.body.refreshTokenVerifiedData, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '5hr' }),
                "accessTokenExpireTime": fiveHoursLater
            }
        }
    });
});


router.get('/getAppVersion', async (req, res) => {
    try {
        let versionData = await AppVersionModel.findOne().sort({ version_name: -1 }).limit(1).catch(err => {
            console.error(err.message, err.stack);
        });
        if (versionData) {
            res.status(200).json({
                message: "success",
                version: versionData.version_name
            })
        } else {
            res.status(404).json({
                message: "failed"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
    }
});

function verifyRefreshToken(req, res, next) {
    let token = req.cookies.refreshToken;
    if (!token) {
        res.status(403).send('token required');
    }
    jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET, (err, data) => {
        if (err) {
            console.error(err.message,err.stack,'verifyRefreshToken auth_controller');
            res.status(401).json({
                error: true,
                msg: "unauthorised token"
            });
        }
        req.body['refreshTokenVerifiedData'] = {
            user_id: data.user_id,
            email: data.email
        }
        next();
    })
}

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
