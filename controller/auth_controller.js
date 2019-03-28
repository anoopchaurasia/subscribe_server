'use strict'
const express = require('express');
const users = require('../models/userDetail');
const axios = require("axios");
const token_model = require('../models/token');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const router = express.Router();
const uniqid = require('uniqid');


router.post('/signin', async (req, res) => {
    try {
        const token = await TokenHandler.getTokenFromCode(req.body.code);
        const payload = await TokenHandler.verifyIdToken(token);
        let user = await users.findOne({
            'email': payload.email
        }).catch(err => {
            console.log(err);
        })
        let access_token = token.tokens.access_token;
        let authToken = token.tokens;
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        console.log("calling watch api from signin")
        await Expensebit.watchapi(oauth2Client);
        if (!user) {
            let body = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=" + access_token);
            let userInfoData = body.data;
            user =await create_user(userInfoData, payload);
            await TokenHandler.create_or_update(user, token.tokens);
            let response = await create_token(user);
            if (response) {
                res.status(200).json({
                    error: false,
                    data: response
                })
            }
        }else{
            await TokenHandler.create_or_update(user, token.tokens);
            let response = await create_token(user);
            if (response) {
                res.status(200).json({
                    error: false,
                    data: response
                })
            }
        }
    } catch (ex) {
        console.log(ex);
    }
});

async function create_token(user) {
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    var tokmodel = new token_model({
        "user_id": user._id,
        "token": token_uniqueid,
        "created_at": new Date()
    });
    await tokmodel.save().catch(err => {
        console.log(err);
    });
    return {
        "tokenid": token_uniqueid,
        "user": user
    };
}

async function create_user(userInfoData, payload) {
    var newUser = new users({
        "email": userInfoData.email || payload.email,
        "name": userInfoData.name || payload.name,
        "image_url": userInfoData.picture || payload.picture,
        "given_name": userInfoData['given_name'] ? userInfoData.given_name : "",
        "family_name": userInfoData['family_name'] ? userInfoData.family_name : "",
        "gender": userInfoData['gender'] ? userInfoData.gender : "",
        "birth_date": userInfoData['birth_date'] ? userInfoData.birth_date : "",
    });
    return await newUser.save().catch(err => {
        console.log(err);
    });
}
module.exports = router
