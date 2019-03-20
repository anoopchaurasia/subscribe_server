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
<<<<<<< Updated upstream
    };
    let tokens = await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
        console.log(err);
    });
    // console.log(tokens);
}


router.get('/signin_token', async (req, res) => {
    try {
        fs.readFile('./client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            let credentials = JSON.parse(content);
            var clientSecret = credentials.installed.client_secret;
            var clientId = credentials.installed.client_id;
            var redirectUrl = credentials.installed.redirect_uris[0];
            var OAuth2 = google.auth.OAuth2;
            var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            var flag = true;
            if (flag) {
                getNewToken(oauth2Client);
            } else {
                oauth2Client.credentials = JSON.parse(token);
            }
        });
    } catch (ex) {

    }
});

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client) {
    var authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

module.exports = router



=======
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
>>>>>>> Stashed changes
