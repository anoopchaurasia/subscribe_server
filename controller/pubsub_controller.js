var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let user_model = require('../models/userDetail');
let fcmToken = require('../models/fcmToken');
let Request = require("request");
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio')
const simpleParser = require('mailparser').simpleParser;
var FCM = require('fcm-node');
var serverKey = 'AAAA12xOmRA:APA91bGDj3guvTDKn6S9yQG3otsv01qEOflCJXiAwM2KgVfN7S6I8hSh0bpggjwpYMoZWuEO6lay6n3_cDldmYPb-ti-oVfexORlG3m2sgisDBCcst4v02ayWdYS6RboVYBCObo0pPL_'; //put your server key here
var fcm = new FCM(serverKey);

var gmail = google.gmail('v1');

router.get('/testingpubsub', function (req, res) {
    res.send("In pubsub CONTROLLER");
});


router.post('/getemail', async (req, response) => {
    if (!req.body || !req.body.message || !req.body.message.data) {
        return res.sendStatus(400);
    }
    const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64')
        .toString('utf8');
    var content;
    try {
        content = JSON.parse(dataUtf8encoded);
        var email_id = content.emailAddress;
        var historyID = content.historyId;
        let doc = await user_model.findOne({ "email": email_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc._id }).catch(err => {
                console.log(err);
            });
            console.log(email_id)
            if (tokenInfo) {
                if (new Date(tokenInfo.expiry_date) >= new Date()) {
                    tokenInfo.expiry_date = new Date(tokenInfo.expiry_date);
                    let coontent =await fs.readFileSync('./client_secret.json');
                    let credentials = JSON.parse(coontent);
                    let clientSecret = credentials.installed.client_secret;
                    let clientId = credentials.installed.client_id;
                    let redirectUrl = credentials.installed.redirect_uris[0];
                    let OAuth2 = google.auth.OAuth2;
                    let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                    oauth2Client.credentials = tokenInfo;
                    var options = {
                        userId: 'me',
                        'startHistoryId': historyID-10,
                        auth: oauth2Client
                    };
                    let res = await gmail.users.history.list(options).catch(err => {
                        console.log(err);
                    });
                    if (res) {
                        let data = res.data;
                        if (data && data.history) {
                            let history = data.history;
                            let messageIDS = [];
                            history.forEach(his => {
                                his.messages.forEach(msg => {
                                    messageIDS.push(msg.id)
                                });
                            });
                            await getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                            response.sendStatus(200);
                        } 
                    }

                } else {
                    let content = fs.readFileSync('./client_secret.json');
                    let cred = JSON.parse(content);
                    let clientSecret = cred.installed.client_secret;
                    let clientId = cred.installed.client_id;
                    var body = JSON.stringify({
                        "client_id": clientId,
                        "client_secret": clientSecret,
                        "refresh_token": tokenInfo.refresh_token,
                        "grant_type": 'refresh_token',
                    });
                    var settings = {
                        "url": "https://www.googleapis.com/oauth2/v4/token",
                        "method": "POST",
                        body: body,
                        "headers": {
                            'Content-Type': 'application/json',
                            "access_type": 'offline'
                        }
                    }

                    Request(settings, async (error, resp, body) => {
                        if (error) {
                            return console.log(error);
                        }
                        if (body) {
                            console.log("came here")
                            body = JSON.parse(body);
                            let milisec = new Date().getTime();
                            milisec = milisec + (body.expires_in * 1000);
                            tokenInfo.access_token = body.access_token;
                            tokenInfo.expiry_date = new Date(milisec);
                            var oldvalue = {
                                user_id: doc._id
                            };
                            var newvalues = {
                                $set: {
                                    access_token: body.access_token,
                                    expiry_date: new Date(milisec)
                                }
                            };
                            var upsert = {
                                upsert: true
                            };
                            let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                                console.log(err);
                            });
                            if (result) {
                                let redirectUrl = cred.installed.redirect_uris[0];
                                let OAuth2 = google.auth.OAuth2;
                                let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                                oauth2Client.credentials = tokenInfo;
                                var options = {
                                    userId: 'me',
                                    'startHistoryId': historyID-10,
                                    auth: oauth2Client

                                };

                                let res = await gmail.users.history.list(options).catch(err => {
                                    console.log(err);
                                });
                                if (res) {
                                    let data = res.data;
                                    if (data && data.history) {
                                        let history = data.history;
                                        let messageIDS = [];
                                        history.forEach(his => {
                                            his.messages.forEach(msg => {
                                                messageIDS.push(msg.id)
                                            });
                                        });
                                        await getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                                        response.sendStatus(200);
                                    } 
                                }
                            }
                        }
                    });
                }
            }
        } else {
            response.sendStatus(400);
        }
    } catch (ex) {
        console.error(ex)
        response.sendStatus(400);
    }
});


router.post('/gethistoryList', async function (req, response) {
    try {
        let email_id = req.body.email_id;
        let doc = await user_model.findOne({ "email": email_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc._id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let historyID = req.body.historyID;
                if (tokenInfo.expiry_date >= new Date()) {
                    tokenInfo.expiry_date = tokenInfo.expiry_date.getTime();
                    let coontent = fs.readFileSync('./client_secret.json');
                    let credentials = JSON.parse(coontent);
                    let clientSecret = credentials.installed.client_secret;
                    let clientId = credentials.installed.client_id;
                    let redirectUrl = credentials.installed.redirect_uris[0];
                    let OAuth2 = google.auth.OAuth2;
                    let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                    oauth2Client.credentials = tokenInfo;
                    var options = {
                        userId: 'me',
                        'startHistoryId': historyID,
                        auth: oauth2Client
                    };

                    let res = await gmail.users.history.list(options).catch(err => {
                        console.log(err);
                    });
                    if (res) {
                        let data = res.data;
                        if (data && data.history) {
                            let history = data.history;
                            let messageIDS = [];
                            history.forEach(his => {
                                his.messages.forEach(msg => {
                                    messageIDS.push(msg.id)
                                });
                            });
                            await getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                            response.status(200).json({
                                error: false,
                                data: messageIDS
                            })
                        } else if (data && !data.history) {
                            // response.status(200).json({
                            //     error: false,
                            //     data: "no msg ids"
                            // })
                        }
                    }
                } else {
                    let content = fs.readFileSync('./client_secret.json');
                    let cred = JSON.parse(content);
                    let clientSecret = cred.installed.client_secret;
                    let clientId = cred.installed.client_id;
                    var body = JSON.stringify({
                        "client_id": clientId,
                        "client_secret": clientSecret,
                        "refresh_token": tokenInfo.refresh_token,
                        "grant_type": 'refresh_token',
                    });

                    var settings = {
                        "url": "https://www.googleapis.com/oauth2/v4/token",
                        "method": "POST",
                        body: body,
                        "headers": {
                            'Content-Type': 'application/json',
                            "access_type": 'offline'
                        }
                    }

                    Request(settings, async (error, resp, body) => {
                        if (error) {
                            return console.log(error);
                        }
                        if (body) {
                            body = JSON.parse(body);
                            let milisec = new Date().getTime();
                            milisec = milisec + (body.expires_in * 1000);
                            tokenInfo.accessToken = body.access_token;
                            tokenInfo.expiry_date = new Date(milisec);
                            var oldvalue = {
                                user_id: doc._id
                            };
                            var newvalues = {
                                $set: {
                                    access_token: body.access_token,
                                    expiry_date: new Date(milisec)
                                }
                            };
                            var upsert = {
                                upsert: true
                            };
                            let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                                console.log(err);
                            });
                            if (result) {
                                let redirectUrl = cred.installed.redirect_uris[0];
                                let OAuth2 = google.auth.OAuth2;
                                let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                                oauth2Client.credentials = tokenInfo;
                                var options = {
                                    userId: 'me',
                                    'startHistoryId': historyID,
                                    auth: oauth2Client
                                };
                                let res = await gmail.users.history.list(options).catch(err => {
                                    console.log(err);
                                });
                                if (res) {
                                    let data = res.data;
                                    if (data && data.history) {
                                        let history = data.history;
                                        let messageIDS = [];
                                        history.forEach(his => {
                                            his.messages.forEach(msg => {
                                                messageIDS.push(msg.id)
                                            });
                                        });
                                        await getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                                        response.status(200).json({
                                            error: false,
                                            data: messageIDS
                                        })
                                    } else if (data && !data.history) {
                                        // response.status(200).json({
                                        //     error: false,
                                        //     data: "no msg ids"
                                        // })
                                    }
                                }
                            }
                        }
                    });

                }
            }
        }
    } catch (ex) {

    }

});


async function getRecentEmail(user_id, auth, messageIDS, nextPageToken) {
    messageIDS.forEach(async mids => {
        let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': mids }).catch(err => {
            console.log(err);
        });
        if (response) {
            if (response.data.payload || response.data.payload['parts']) {
                let message_raw = response.data.payload['parts'] == undefined ? response.data.payload.body.data
                    : response.data.payload.parts[0].body.data;
                let data = message_raw;
                buff = Buffer.from(data, 'base64');
                text = buff.toString();
                simpleParser(text, async (err, parsed) => {
                    if (parsed) {
                        if (parsed['text']) {
                            await checkEmail(parsed['text'], response['data'], user_id, auth);
                        }
                        if (parsed['headerLines']) {
                            await checkEmail(parsed.headerLines[0].line, response['data'], user_id, auth);
                        }
                        if (parsed['textAsHtml']) {
                            await checkEmail(parsed['textAsHtml'], response['data'], user_id, auth);
                        }
                    }
                });
            }

        }
    });
}



let checkEmail = async (emailObj, mail, user_id, auth) => {
    $ = cheerio.load(emailObj)
    let url = null;
    let emailInfo = {};
    $('a').each(function (i, elem) {
        let fa = $(this).text();
        let anchortext = fa.toLowerCase();
        let anchorParentText = $(this).parent().text().toLowerCase();
        if (anchortext.indexOf("unsubscribe") != -1 ||
            anchortext.indexOf("preferences") != -1 ||
            anchortext.indexOf("subscription") != -1 ||
            anchortext.indexOf("visit this link") != -1 ||
            anchortext.indexOf("do not wish to receive our mails") != -1 ||
            anchortext.indexOf("not receiving our emails") != -1)
        {
            
                url = $(this).attr().href;
                console.log(url);

        }else if(anchorParentText.indexOf("not receiving our emails") != -1 ||
            anchorParentText.indexOf("stop receiving emails") != -1 ||
            anchorParentText.indexOf("unsubscribe") != -1 ||
            anchorParentText.indexOf("subscription") != -1 ||
            anchorParentText.indexOf("preferences") != -1 ||
            anchorParentText.indexOf("mailing list") != -1 ||
            (anchortext.indexOf("click here") != -1 && anchorParentText.indexOf("mailing list") != -1) ||
            ((anchortext.indexOf("here") != -1 || anchortext.indexOf("click here") != -1) && anchorParentText.indexOf("unsubscribe") != -1) ||
            anchorParentText.indexOf("Don't want this") != -1) 
        {
            url = $(this).attr().href;
            console.log(url)
        }
    })
    if (url != null) {
        console.log("came here")
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = null;
        emailInfo['email_id'] = mail.id;
        console.log(mail.id)
        emailInfo['historyId'] = mail.historyId;
        emailInfo['labelIds'] = mail.labelIds;
        emailInfo['unsubscribe'] = url;
        emailInfo['is_moved'] = false;
        emailInfo['is_delete'] = false;
        emailInfo['is_keeped'] = false;
        if (mail.labelIds.indexOf("TRASH") != -1) {
            emailInfo['is_trash'] = true;
        } else {
            emailInfo['is_trash'] = false;
        }
        header_raw = mail['payload']['headers']
        header_raw.forEach(data => {
            if (data.name == "From") {
                let from_data = data.value.indexOf("<") != -1 ? data.value.split("<")[1].replace(">", "") : data.value;
                emailInfo['from_email_name'] = data.value;
                emailInfo['from_email'] = from_data;
            } else if (data.name == "To") {
                emailInfo['to_email'] = data.value;
            } else if (data.name == "Subject") {
                emailInfo['subject'] = data.value;
            }
        });
        try {
            let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => {
                console.log(err);
            });
            if (!doc) {
                let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true, "user_id": user_id }).catch(err => {
                    console.log(err);
                });
                await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                if (mailList) {
                    console.log(mailList)
                    await getListLabel(user_id, auth, emailInfo);
                }
                let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_trash": true, "user_id": user_id }).catch(err => { console.log(err); });
                if (mailInfo) {
                    await deleteEmailsAndMoveToTrash(auth, emailInfo);
                }
                    let tokenInfo = await fcmToken.findOne({ "user_id": user_id }).catch(err => {
                        console.log(err);
                    });
                    if (tokenInfo) {
                        var message = {
                            to: tokenInfo.fcm_token,
                            collapse_key: 'geern',
                            notification: {
                                title: 'New Email Newsletter',
                                body: 'You received new newsletter in you INBOX.'
                            }
                        };
                        await sendFcmMessage(message);
                    }
                // }
            }
        } catch (err) {
            console.log(err)
        }
    }
}


let getListLabel = async (user_id, auth, mailList) => {
    const gmail = google.gmail({ version: 'v1', auth });
    var res = await gmail.users.labels.list({
        userId: 'me',
    }).catch(err => {
        console.log(err);
    });
    
    if (res) {
        let lbl_id = null;
        res.data.labels.forEach(lbl => {
            if (lbl.name === "Unsubscribed Emails") {
                lbl_id = lbl.id;
            }
        });
        if (lbl_id == null) {
            var res = gmail.users.labels.create({
                userId: 'me',
                resource: {
                    "labelListVisibility": "labelShow",
                    "messageListVisibility": "show",
                    "name": "Unsubscribed Emails"
                }
            }).catch(err => {
                console.log(err);
            });
            if (res) {
                var oldvalue = {
                    user_id: user_id
                };
                var newvalues = {
                    $set: {
                        "label_id": res.data.id
                    }
                };
                var upsert = {
                    upsert: true
                };
                var result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                    console.log(err);
                });
                if (result) {
                    await MoveMailFromInBOX(user_id, auth, mailList, res.data.id);
                }
            }
        } else {
            var oldvalue = {
                user_id: user_id
            };
            var newvalues = {
                $set: {
                    "label_id": lbl_id
                }
            };
            var upsert = {
                upsert: true
            };
            let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            });
            if (result) {
                await MoveMailFromInBOX(user_id, auth, mailList, lbl_id);
            }
        }
    }
}







async function MoveMailFromInBOX(user_id, auth, mailList, label) {
    const gmail = google.gmail({ version: 'v1', auth });

    let labelarry = [];
    labelarry[0] = label;
    if (mailList.email_id) {
        var oldvalue = {
            "email_id": mailList.email_id
        };
        var newvalues = {
            $set: {
                "is_moved": true
            }
        };
        var upsert = {
            upsert: true
        };
        let result = await email.findOneAndUpdate(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });;
        let res = await gmail.users.messages.modify({
            userId: 'me',
            'id': mailList.email_id,
            resource: {
                'addLabelIds': labelarry,
            }
        }).catch(err => {
            console.log(err);
        });
        let resp = await gmail.users.messages.modify({
            userId: 'me',
            'id': oneEmail.email_id,
            resource: {
                "removeLabelIds": ['INBOX']
            }
        });

    }
}


async function deleteEmailsAndMoveToTrash(user_id, auth, from_email) {
    const gmail = google.gmail({ version: 'v1', auth });
    if (emailInfo.email_id) {
        let modifying = await gmail.users.messages.modify({
            userId: 'me',
            'id': emailInfo.email_id,
            resource: {
                'addLabelIds': ["TRASH"]
            }
        }).catch(err => {
            console.log(err);
        });
        if (modifying ) {
            var oldvalue = {
                email_id: emailInfo.email_id
            }; 
            var newvalues = {
                $set: {
                    "is_trash": true
                }
            };
            await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
        }
    }
}
let historyListapi = async (oauth2Client, historyID) => {
    var options = {
        userId: 'me',
        'startHistoryId': historyID,
        auth: oauth2Client
    };
    let res = await gmail.users.history.list(options).catch(err => {
        console.log(err);
    });
    if (res) {
        let data = res.data;
        if (data && data.history) {
            let history = data.history;
            history.forEach(his => {
                his.messages.forEach(msg => {
                    console.log(msg.id)
                });
            });
        }
    }
}

let sendFcmMessage = async (message) => {
    fcm.send(message, async function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}

module.exports = router



// 'use strict'
// const express = require('express');
// const user_model = require('../models/userDetail');
// const TokenHandler = require("../helper/TokenHandler").TokenHandler;
// const Pubsub = require("../helper/pubsub").Pubsub;
// const router = express.Router();
// const { google } = require('googleapis');
// const gmail = google.gmail('v1');


// router.post('/getemail', async (req, response) => {
//     if (!req.body || !req.body.message || !req.body.message.data) {
//         return res.sendStatus(400);
//     }
//     const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64').toString('utf8');
//     var content;
//     try {
//         content = JSON.parse(dataUtf8encoded);
//         var email_id = content.emailAddress;
//         var historyID = content.historyId;
//         // var email_id = req.body.email_id;
//         // var historyID = req.body.history_id;
//         let userInfo = await user_model.findOne({ "email": email_id }).catch(err => { console.log(err); });
//         if (userInfo) {
//             let authToken = await TokenHandler.getAccessToken(userInfo._id).catch(e => console.error(e));
//             let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            
//             var options = {
//                 userId: 'me',
//                 'startHistoryId': historyID-10,
//                 auth: oauth2Client
//             };
//             // console.log(options)
//             let res = await gmail.users.history.list(options).catch(err => { console.log(err); });
//             if (res) {
//                 let data = res.data;
//                 if (data && data.history) {
//                     let history = data.history;
//                     let messageIDS = [];
//                     // console.log(history)
//                     history.forEach(async his => {
//                         his.messages.forEach(async msg => {
//                             messageIDS.push(msg.id)
//                         });
//                     });
//                     if(messageIDS.length!=0){
//                         // console.log(messageIDS)
//                         await Pubsub.getRecentEmail(userInfo._id, oauth2Client, messageIDS);
//                     }
//                     response.sendStatus(200);
//                 }
//                 // else{
//                 //     response.sendStatus(200);
//                 // }
//             }
//         } else {
//             response.sendStatus(400);
//         }
//     } catch (ex) {
//         console.error(ex)
//         response.sendStatus(400);
//     }
// });


// module.exports = router