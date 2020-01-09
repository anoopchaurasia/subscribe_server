
let express = require('express');
let users = require('../models/user');
let token_model = require('../models/tokeno');
let router = express.Router();
const Outlook = require("../helper/outlook").Outlook;

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
fm.Include("com.anoop.outlook.Controller");
let Controller = com.anoop.outlook.Controller;

router.get('/getOutLookApiUrl', async function (req, res) {
    let source = req.query.source;
    console.log(source)
    let returnVal = await Controller.getOutlookUrl(source).catch(err => {
        console.error(err);
    });
    if (returnVal) {
        res.status(200).json({
            error: false,
            data: returnVal
        })
    } else {
        res.status(400).json({
            error: true,
            data: null
        })
    }
});

router.get('/auth/callback', async function (req, res) {
    let auth_code = req.query.code;
    let state = req.query.state;
    let source = req.query.source;
    let tokeninfo;
    if(source=="web"){
        tokeninfo = await Controller.createAndStoreTokenWeb(auth_code, state).catch(err => {
            console.error(err);
        });
    }else{
        tokeninfo = await Controller.createAndStoreToken(auth_code, state).catch(err => {
            console.error(err);
        });
    }
    res.status(200).json({
        error: false,
        data: tokeninfo
    })
});

router.get('/getPushNotification', async function (req, res) {
    console.log("came here for url")
});


router.get('/getAuthTokenForApi', async function (req, res) {
    let state_code = req.query.state_code;
    let user = await users.findOne({ state: state_code }).catch(err => {
        console.error(err);
    });
    if (user) {
        let tokenData = await token_model.findOne({ "user_id": user._id }).catch(err => {
            console.error(err);
        });
        var userdata = {
            state: null
        };
        await Outlook.updateUserInfo({ "state": state_code }, userdata);
        res.status(200).json({
            error: false,
            data: tokenData,
            user: user
        })
    } else {
        res.status(404).json({
            error: true,
            data: "no user found"
        })
    }
});


router.post('/getPushNotification', async function (req, res) {
    if (req.query && req.query.validationToken) {
        res.setHeader('content-type', 'text/plain');
        res.write(req.query.validationToken);
        res.end();
    } else {
        let data = req.body.value;
        await Controller.getNotificationEmailData(data).catch(err => {
            console.error(err);
        });
        res.sendStatus(202);
    }
});


module.exports = router