var fs            = require('fs');
let express       = require('express');
let mongoose      = require("mongoose");
let users         = require('../models/userDetail');
let auth_token    = require('../models/authToken');
let token_model   = require('../models/token');
let router        = express.Router();
var { google }    = require('googleapis');
var uniqid        = require('uniqid');
let {client_secret, client_id, redirect_uris} = JSON.parse(fs.readFileSync(process.env.GOOGLE_CLIENT_SECRET_FILE)).installed;

router.post('/signin', async (req, res) => {
    var code         = req.body.code;
    var OAuth2       = google.auth.OAuth2;
    var oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
    let token = oauth2Client.getToken(code).catch(e=> console.error(e));
    const client = new OAuth2(client_id);
    const ticket = await client.verifyIdToken({
        idToken: token.id_token,
        audience: client_id,
    });
    const payload = ticket.getPayload();
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    let user = await users.findOne({ 'email': payload.email }).catch(err => {
        console.log(err);
    })
    if (!user) {
        user = await create_user(payload);
    }
    await extract_token(user, token).catch(err => {
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
});

async function create_user(user){
    await new users({
        "email": user.email,
        "name": user.name,
        "image_url": user.picture
    }).save().catch(err => {
        console.log(err);
    });
    return await users.findOne({email: user.email});
}

async function extract_token(user, {access_token, refresh_token, id_token, expiry_date, scope, token_type}) {
    var tokedata = compact({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "id_token": id_token,
        "scope": scope,
        "token_type": token_type,
        "expiry_date": expiry_date,
        "user_id": user._id,
        "created_at": new Date()
    });
    return await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
        console.log(err);
    });
}

function compact(obj ={}){
    for(let p in obj) {
        if(obj[p]=== undefined && obj.hasOwnProperty(p)) {
            delete obj[p];
        }
    }
    return obj;
}

module.exports = router
