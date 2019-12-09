
let express = require('express');
let users = require('../models/user');
let token_model = require('../models/tokeno');
let router = express.Router();
const Outlook = require("../helper/outlook").Outlook;
const jwt = require('jsonwebtoken');
fm.Include("com.anoop.email.BaseController");

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
fm.Include("com.anoop.outlook.Controller");
let Controller = com.anoop.outlook.Controller;

router.get('/getOutLookApiUrl', async function (req, res) {
    let returnVal = await Controller.getOutlookUrl().catch(err => {
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
    await Controller.createAndStoreToken(auth_code, state).catch(err => {
        console.error(err);
    });
    res.send();
});

router.get('/getPushNotification', async function (req, res) {
    console.log("came here for url")
});


router.get('/getAuthTokenForApi', async function (req, res) {
    let state_code = req.query.state_code;
    let user = await users.findOne({ state: state_code });
    if (user) {
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        let response = await Controller.createToken(user, ipaddress).catch(err => {
            console.error(err);
        });
        var userdata = {
            state: null
        };
        await Outlook.updateUserInfo({ "state": state_code }, userdata);
        return res.cookie("refreshToken", response.token.refreshToken).status(200).json({
            error: false,
            status: 200,
            data: response,
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

router.post('/getMail',jwtTokenVerify, async function (req, resp, next) {
    let doc = req.token;
    await Controller.extractEmail(doc.user_id).catch(e => console.error(e));
    resp.status(200).json({
        error: false,
        message: "scrapping"
    })
})

router.post('/setPrimaryEmail',jwtTokenVerify, async (req, res) => {
    try {
        let doc = req.token;
        let email = req.body.email;
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        if (email != null) {
            await Controller.setPrimaryEmail(doc.user_id, email, ipaddress);
            res.status(200).json({
                error: false,
                status: 200
            })
        } else {
            res.status(400).json({
                error: true,
                status: 400
            })
        }
    } catch (error) {
        console.error(error.message, error.stack, 'setPrimaryEmail')
        res.send({ "status": 401, "data": error })
    }
});

router.post('/moveEmailFromInbox',jwtTokenVerify, async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let doc = req.token;
        await Controller.moveEmailFromInbox(doc.user_id, from_email);
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertMailToInbox', jwtTokenVerify,async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let doc = req.token;
        await Controller.revertUnsubToInbox(doc.user_id, from_email);
        res.status(200).json({
            error: false,
            data: "revert"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertTrashMailToInbox',jwtTokenVerify, async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let doc = req.token;
        await Controller.revertTrashToInbox(doc.user_id, from_email);
        res.status(200).json({
            error: false,
            data: "revert"
        })

    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/moveEmailToTrashFromInbox',jwtTokenVerify, async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let doc = req.token;
        await Controller.moveEmailToTrashFromInbox(doc.user_id, from_email);
        res.status(200).json({
            error: false,
            data: "trash"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});


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
            console.error(err.message,err.stack, 'jwtTokenVerify function error')
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


module.exports = router