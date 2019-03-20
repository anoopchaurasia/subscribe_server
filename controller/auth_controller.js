const express = require('express');
const users = require('../models/userDetail');
const axios = require("axios");
const token_model = require('../models/token');
const TokenHandler = require("../helper/TokenHandler");
const router = express.Router();
var uniqid = require('uniqid');


router.post('/signin', async (req, res) => {
    try {
        const token = await TokenHandler.getTokenFromCode(req.body.code);
        const payload = await TokenHandler.verifyIdToken(token);
        let user = await users.findOne({
            'email': payload.email
        }).catch(err => {
            console.log(err);
        })
        if (!user) {
            let body = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=" + token.access_token);
            let userInfoData = JSON.parse(body);
            user = create_user(userInfoData, payload);
        }
        await create_or_update(user, token);
        res.status(200).json( await create_token())
    } catch (ex) {
        console.log(ex);
    }
});

async function create_token (user) {
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
