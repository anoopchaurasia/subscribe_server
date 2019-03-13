var fs = require('fs');
let express = require('express');
let users = require('../models/userDetail');
let Request = require("request");
let auth_token = require('../models/authToken');
let token_model = require('../models/token');
let router = express.Router();
var { google } = require('googleapis');
var uniqid = require('uniqid');

router.post('/signin', async (req, res) => {
    try {
        console.log("login api")
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
                    if (token) {
                       const client = new OAuth2(clientId);
                        const ticket = await client.verifyIdToken({
                            idToken: token.id_token,
                            audience: clientId,
                        });
                        const payload = ticket.getPayload();
                        var token_uniqueid = uniqid() + uniqid() + uniqid();
                        let user = await users.findOne({ 'email': payload.email }).catch(err => {
                            console.log(err);
                        })
                        if (!user) {
                            
                            var settings = {
                                
                                "url": "https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token="+token.access_token,
                                "method": "GET"
                            }

                            Request(settings, async (error, response, body) => {
                                if (error) {
                                    return console.log(error);
                                }
                                if (body) {
                                    let userInfoData = JSON.parse(body);
                                    var newUser = new users({
                                        "email": userInfoData.email||payload.email,
                                        "name": userInfoData.name|| payload.name,
                                        "image_url": userInfoData.picture||payload.picture,
                                        "given_name": userInfoData['given_name'] ? userInfoData.given_name:"",
                                        "family_name": userInfoData['family_name'] ? userInfoData.family_name : "",
                                        "gender": userInfoData['gender'] ? userInfoData.gender : "",
                                        "birth_date": userInfoData['birth_date'] ? userInfoData.birth_date : "",
                                    });
                                    let userdata = await newUser.save().catch(err => {
                                        console.log(err);
                                    });
                                    if (userdata) {
                                        await extract_token(userdata, token.access_token, token.refresh_token, token.id_token, token.expiry_date, token.scope, token.token_type).catch(err => {
                                            console.log(err);
                                        });
                                        var tokmodel = new token_model({
                                            "user_id": userdata._id,
                                            "token": token_uniqueid,
                                            "created_at": new Date()
                                        });
                                        let tokenid = await tokmodel.save().catch(err => {
                                            console.log(err);
                                        });
                                        if (tokenid) {
                                            var jsondata = { "tokenid": token_uniqueid, "user": userdata };
                                            res.status(200).json({
                                                error: false,
                                                data: jsondata
                                            })
                                        }
                                    }
                                   
                                }
                            });
                            
                        } else {
                            await extract_token(user, token.access_token, token.refresh_token, token.id_token, token.expiry_date, token.scope, token.token_type).catch(err => {
                                console.log(err);
                            });
                            var tokmodel = new token_model({
                                "user_id": user._id,
                                "token": token_uniqueid,
                                "created_at": new Date()
                            });
                            let tokenid = await tokmodel.save().catch(err => {
                                console.log(err);
                            });
                            if (tokenid) {
                                var jsondata = { "tokenid": token_uniqueid, "user": user };
                                res.status(200).json({
                                    error: false,
                                    data: jsondata
                                })
                            }
                        }
                    }
                });
            });
    } catch (ex) {
        console.log(ex);
    }
});

async function extract_token(user, access_token, refresh_token, id_token, expiry_date, scope, token_type) {
    console.log(user)
    console.log(user._id)
    var tokedata = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "id_token": id_token,
        "scope": scope,
        "token_type": token_type,
        "expiry_date": expiry_date,
        "user_id": user._id,
        "created_at": new Date()
    };
    await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
        console.log(err);
    });
}



module.exports = router



