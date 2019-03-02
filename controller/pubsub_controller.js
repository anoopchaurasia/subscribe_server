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
        console.log(historyID)
        let doc = await user_model.findOne({ "email": email_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc._id }).catch(err => {
                console.log(err);
            });
            console.log(email_id)
            console.log(tokenInfo)
            if (tokenInfo) {
                console.log(tokenInfo.expiry_date)
               console.log(new Date(tokenInfo.expiry_date)) 
                if (new Date(tokenInfo.expiry_date) >= new Date()) {
                    console.log(email_id)
                    tokenInfo.expiry_date = new Date(tokenInfo.expiry_date);
                    let coontent =await fs.readFileSync('./client_secret.json');
                    let credentials = JSON.parse(coontent);
                    let clientSecret = credentials.installed.client_secret;
                    let clientId = credentials.installed.client_id;
                    let redirectUrl = credentials.installed.redirect_uris[0];

                    let OAuth2 = google.auth.OAuth2;
                    let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                    oauth2Client.credentials = tokenInfo;
                    console.log(oauth2Client)
                    var options = {
                        userId: 'me',
                        'startHistoryId': historyID-50,
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
                        } else if (data && !data.history) {
                            // response.sendStatus(200);
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
                            console.log(tokenInfo.expiry_date)
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
                                    'startHistoryId': historyID-50,
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
                                    } else if (data && !data.history) {
                                        // response.sendStatus(200);
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
        console.log(ex)
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
            let header_raw = response['data']['payload']['headers'];
            let head;
            header_raw.forEach(data => {
                if (data.name == "Subject") {
                    head = data.value
                    console.log(head)
                }
            });
            if (response.data.payload) {
                let message_raw = response.data.payload.parts[0].body.data;
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

    // $('a').each(function (i, elem) {
    //     let fa = $(this).text();
    //     if (fa.toLowerCase().indexOf("unsubscribe") != -1 || $(this).parent().text().toLowerCase().indexOf("unsubscribe") != -1) {
    //         url = $(this).attr().href;
    //         console.log(url)
    //     }
    // })
    $('a').each(function (i, elem) {
        let fa = $(this).text();
        // console.log($(this))
        // console.log(fa);
        if (fa.toLowerCase().indexOf("unsubscribe") != -1 ||
            fa.toLowerCase().indexOf("preferences") != -1 ||
            fa.toLowerCase().indexOf("subscription") != -1 ||
            fa.toLowerCase().indexOf("visit this link") != -1 ||
            fa.toLowerCase().indexOf("do not wish to receive our mails") != -1 ||
            fa.toLowerCase().indexOf("not receiving our emails") != -1 ||
            $(this).parent().text().toLowerCase().indexOf("not receiving our emails") != -1 ||
            $(this).parent().text().toLowerCase().indexOf("stop receiving emails") != -1 ||
            $(this).parent().text().toLowerCase().indexOf("unsubscribe") != -1 ||
            $(this).parent().text().toLowerCase().indexOf("subscription") != -1 ||
            $(this).parent().text().toLowerCase().indexOf("preferences") != -1 ||
            $(this).parent().text().toLowerCase().indexOf("mailing list") != -1 ||
            (fa.toLowerCase().indexOf("click here") != -1 && $(this).parent().text().toLowerCase().indexOf("mailing list") != -1) ||
            ((fa.toLowerCase().indexOf("here") != -1 || fa.toLowerCase().indexOf("click here") != -1) && $(this).parent().text().toLowerCase().indexOf("unsubscribe") != -1) ||
            $(this).parent().text().toLowerCase().indexOf("Don't want this") != -1) {
            url = $(this).attr().href;
            console.log(url)
        }
    })
    if (url != null) {
        console.log("came here")
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = mail
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
            let doc = await email.findOne({ "email_id": emailInfo.email_id }).catch(err => {
                console.log(err);
            });
            console.log(doc)
            if (!doc) {
                
                // if (docInfo) {
                    let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true }).catch(err => {
                        console.log(err);
                    });
                    console.log(mailList)
                    if (mailList) {
                        console.log("successfully moved to folder unscribe");
                        emailInfo.is_moved=true;
                        let docInfo = await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => {
                            console.log(err);
                        });
                        console.log(docInfo)
                        await getListLabel(user_id, auth, mailList)
                    }
                    let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_delete": true }).catch(err => {
                        console.log(err);
                    });
                    if (mailInfo) {
                        emailInfo.is_delete=true;
                        let docInfo = await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => {
                            console.log(err);
                        });
                        console.log(docInfo)
                        console.log("successfully moved to folder delete");
                        await deleteEmailsAndMoveToTrash(user_id, auth, mailList.from_email)
                    }
                    if(!mailList && !mailInfo){
                        let docInfo = await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => {
                            console.log(err);
                        });
                        console.log(docInfo)
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
                    let watch = await watchapi(user_id, auth);
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
    var oldvalue = {
        user_id: user_id,
        "from_email": mailList.from_email,
        "is_moved": false
    };
    var newvalues = {
        $set: {
            "is_moved": true
        }
    };
    var upsert = {
        upsert: true
    };
    let result = await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
        console.log(err);
    });;
    let labelarry = [];
    labelarry[0] = label;
    if (mailList.email_id) {
        let res = await gmail.users.messages.modify({
            userId: 'me',
            'id': mailList.email_id,
            resource: {
                'addLabelIds': labelarry,
            }
        }).catch(err => {
            console.log(err);
        });
    }
}


async function deleteEmailsAndMoveToTrash(user_id, auth, from_email) {
    const gmail = google.gmail({ version: 'v1', auth });
    let mailList = await email.find({ "from_email": from_email }).catch(err => {
        console.log(err);
    });
    if (mailList) {
        let mailIds = [];
        mailList.forEach(email => {
            mailIds.push(email.email_id);
        });
        var oldvalue = {
            user_id: user_id,
            "from_email": from_email,
            "is_delete": false
        };
        var newvalues = {
            $set: {
                "is_delete": true
            }
        };
        var upsert = {
            upsert: true
        };
        let result = await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });
        mailIds.forEach(async mailid => {
            let res = await gmail.users.messages.trash({
                userId: 'me',
                'id': mailid
            }).catch(err => {
                console.log(err);
            });
        });
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