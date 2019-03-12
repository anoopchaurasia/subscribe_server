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
                        console.log(token.access_token)
                        const client = new OAuth2(clientId);
                        const ticket = await client.verifyIdToken({
                            idToken: token.id_token,
                            audience: clientId,
                        });
                        const payload = ticket.getPayload();
                        console.log(payload)
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
                                    console.log("profile data")
                                    console.log(JSON.parse(body));
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
                                    console.log(newUser)
                                    let userdata = await newUser.save().catch(err => {
                                        console.log(err);
                                    });
                                   
                                }
                            });
                            
                            // oauth2Client.setCredentials(token);
                            // const service = google.people({ version: 'v1', auth:oauth2Client });
                            // service.people.get({
                            //     resourceName: 'people/me',
                            //     personFields: 'names,emailAddresses,birthdays,genders',
                            // }, (err, res) => {
                            //     if (err) return console.error('The API returned an error: ' + err);
                            //     console.log("people info",res)
                            //     console.log(res.data.birthdays[0].date)
                            // });
                            // // var oauth2 = google.oauth2({
                            //     auth: oauth2Client,
                            //     version: 'v1'
                            // });
                            // oauth2.userinfo.get(
                            //     function (err, res) {
                            //         if (err) {
                            //             console.log(err);
                            //         } else {
                            //             console.log(res);
                            //         }
                            //     });
                            
                            console.log("chek here", userdata)
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
                                    console.log(jsondata)
                                    res.status(200).json({
                                        error: false,
                                        data: jsondata
                                    })
                                }
                            }
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
                                console.log(jsondata)
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



