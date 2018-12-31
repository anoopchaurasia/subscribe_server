var fs = require('fs');
let express = require('express');
let users = require('../models/userDetail');
let auth_token = require('../models/authToken');
let token_model = require('../models/token');
let router = express.Router();
var { google } = require('googleapis');
var uniqid = require('uniqid');
var readline = require('readline');
var SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly", 
    "profile", 
    "email",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels"
];

router.post('/signin', async (req, res) => {
    try {
        fs.readFile('./client_secret.json',
            async function processClientSecrets(err, content) {
                if (err) {
                    console.log('Error loading client secret file: ' + err);
                    return;
                }
                var code = req.body.code;
                let credentials = JSON.parse(content);
                var clientSecret = credentials.installed.client_secret;
                var clientId = credentials.installed.client_id;
                var redirectUrl = credentials.installed.redirect_uris[0];
                var OAuth2 = google.auth.OAuth2;
                var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                oauth2Client.getToken(code, async function (err, token) {
                    if (err) {
                        console.log('Error while trying to retrieve access token', err);
                        return;
                    }
                    console.log("==========================")
                    console.log(token);
                    console.log("==========================")
                    const client = new OAuth2(clientId);
                    const ticket = await client.verifyIdToken({
                        idToken: token.id_token,
                        audience: clientId,
                    });
                    const payload = ticket.getPayload();
                    console.log(payload);
                    var token_uniqueid = uniqid() + uniqid() + uniqid();
                    users.findOne({
                        'email': payload.email
                    }, async function (err, user) {
                        if (!user) {
                            var newUser = new users({
                                "email": payload.email,
                                "name": payload.name,
                                "image_url": payload.picture
                            });
                            newUser.save(async function (err, userdata) {
                                if (userdata) {
                                    var check = await extract_token(userdata, token.access_token, token.refresh_token, token.id_token, token.expiry_date, token.scope, token.token_type);
                                    var tokmodel = new token_model({
                                        "user_id": userdata._id,
                                        "token": token_uniqueid,
                                        "created_at": new Date()
                                    });
                                    tokmodel.save(async function (err, tokenid) {
                                        if (tokenid) {
                                            var jsondata = { "tokenid": token_uniqueid, "user": userdata };
                                            res.status(200).json({
                                                error: false,
                                                data: jsondata
                                            })
                                        }
                                    });
                                }
                            });
                        } else {
                            var check = await extract_token(user, token.access_token, token.refresh_token, token.id_token, token.expiry_date, token.scope, token.token_type);
                            var tokmodel = new token_model({
                                "user_id": user._id,
                                "token": token_uniqueid,
                                "created_at": new Date()
                            });
                            tokmodel.save(async function (err, tokenid) {
                                if (tokenid) {
                                    var jsondata = { "tokenid": token_uniqueid, "user": user };
                                    res.status(200).json({
                                        error: false,
                                        data: jsondata
                                    })
                                }
                            });
                        }
                    });

                });

            });
    } catch (ex) {
        console.log(ex);
    }
});

async function extract_token(user, access_token, refresh_token, id_token, expiry_date, scope, token_type) {

    var tokedata ={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "id_token": id_token,
            "scope": scope,
            "token_type": token_type,
            "expiry_date": expiry_date,
            "user_id": user._id,
            "created_at": new Date()
        };

        auth_token.findOneAndUpdate({ "user_id": user._id}, tokedata, { upsert: true }, function (err, tokens) {
            if (err) {
                console.log(err)
            } 
            if (tokens) {
                return tokens;
            }
        });
       
}


router.get('/signin_token', async (req, res) => {
    try {
        fs.readFile('./client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            console.log(content)
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



