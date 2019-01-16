var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let token_model = require('../models/token');
let user_model = require('../models/userDetail');
let Request = require("request");
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio')
const simpleParser = require('mailparser').simpleParser;

var gmail = google.gmail('v1');

router.get('/testingpubsub', function (req, res) {
    console.log("In pubsub CONTROLLER");
    res.send("In pubsub CONTROLLER");
});


router.post('/getemail', async (req, response) => {
    console.log(req.body);
    if (!req.body || !req.body.message || !req.body.message.data) {
        return res.sendStatus(400);
    }
    console.log("checking in email api");
    // console.log(req.body.message.data)
    const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64')
        .toString('utf8');
    // var b = new Buffer(req.body.message.data, 'base64')
    // var s = b.toString();
    // console.log(s)
    var content;
    try {
        // console.log(dataUtf8encoded)
        content = JSON.parse(dataUtf8encoded);
        var email_id = content.emailAddress;
        var historyID = content.historyId;
        user_model.findOne({ "email": email_id },
            async function (err, doc) {
                if (err) {
                    console.log(err)
                }
                if (doc) {
                    console.log(doc)
                    auth_token.findOne({ "user_id": doc._id }, async function (err, tokenInfo) {
                        if (err) {
                            console.log(err)
                        }
                        if (tokenInfo) {
                            if (tokenInfo.expiry_date >= new Date()) {
                                tokenInfo.expiry_date = tokenInfo.expiry_date.getTime();
                                fs.readFile('./client_secret.json',
                                    async function processClientSecrets(err, coontent) {
                                        if (err) {
                                            console.log('Error loading client secret file: ' + err);
                                            return;
                                        }
                                        let credentials = JSON.parse(coontent);
                                        let clientSecret = credentials.installed.client_secret;
                                        let clientId = credentials.installed.client_id;
                                        let redirectUrl = credentials.installed.redirect_uris[0];

                                        let OAuth2 = google.auth.OAuth2;
                                        let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                                        oauth2Client.credentials = tokenInfo;
                                        // let watch = await historyListapi(oauth2Client, historyID);
                                        var options = {
                                            userId: 'me',
                                            'startHistoryId': historyID,
                                            // 'pageToken': nextPageToken,
                                            auth: oauth2Client

                                        };

                                        gmail.users.history.list(options, async function (err, res) {
                                            if (err) {
                                                return;
                                            }
                                            let data = res.data;

                                            if (data && data.history) {
                                                let history = data.history;
                                                let messageIDS = [];
                                                history.forEach(his => {
                                                    his.messages.forEach(msg => {
                                                        messageIDS.push(msg.id)
                                                    });
                                                });
                                                console.log(messageIDS)
                                                getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                                                response.sendStatus(200);
                                            } else if (data && !data.history) {
                                                response.sendStatus(200);
                                            }

                                        });
                                    });

                            } else {
                                console.log("expire")
                                // let content = await fs.readFileSync('./client_secret.json');
                                fs.readFile('./client_secret.json',
                                    async function processClientSecrets(err, content) {
                                        if (err) {
                                            console.log('Error loading client secret file: ' + err);
                                            return;
                                        }
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

                                        Request(settings, (error, resp, body) => {
                                            if (error) {
                                                return console.log(error);
                                            }
                                            if (body) {
                                                body = JSON.parse(body);
                                                // console.log(body);
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
                                                auth_token.updateOne(oldvalue, newvalues, upsert, async function (err, result) {
                                                    if (result) {
                                                        console.log(result)
                                                        let redirectUrl = cred.installed.redirect_uris[0];

                                                        let OAuth2 = google.auth.OAuth2;
                                                        let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                                                        oauth2Client.credentials = tokenInfo;
                                                        var options = {
                                                            userId: 'me',
                                                            'startHistoryId': historyID,
                                                            auth: oauth2Client

                                                        };

                                                        gmail.users.history.list(options, async function (err, res) {
                                                            if (err) {
                                                                return;
                                                            }
                                                            let data = res.data;

                                                            if (data && data.history) {
                                                                let history = data.history;
                                                                let messageIDS = [];
                                                                history.forEach(his => {
                                                                    his.messages.forEach(msg => {
                                                                        messageIDS.push(msg.id)
                                                                    });
                                                                });
                                                                console.log(messageIDS)
                                                                getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                                                                response.sendStatus(200);
                                                            } else if (data && !data.history) {
                                                                response.sendStatus(200);
                                                            }

                                                        });

                                                    }
                                                });
                                            }
                                        });
                                    });
                            }

                        }
                    })
                } else {
                    response.sendStatus(400);
                }
            }
        );
    } catch (ex) {
        console.log(ex)
        response.sendStatus(400);
    }
});


router.post('/gethistoryList', async function (req, response) {
    console.log(req.body);
    try {
        console.log(req.body);
        let email_id = req.body.email_id;
        user_model.findOne({ "email": email_id },
            async function (err, doc) {
                if (err) {
                    console.log(err)
                } else {
                    console.log(doc)
                    auth_token.findOne({ "user_id": doc._id }, async function (err, tokenInfo) {
                        if (err) {
                            console.log(err)
                        }
                        if (tokenInfo) {
                            let historyID = req.body.historyID;
                            console.log(tokenInfo.expiry_date, new Date())
                            if (tokenInfo.expiry_date >= new Date()) {
                                tokenInfo.expiry_date = tokenInfo.expiry_date.getTime();
                                fs.readFile('./client_secret.json',
                                    async function processClientSecrets(err, coontent) {
                                        if (err) {
                                            console.log('Error loading client secret file: ' + err);
                                            return;
                                        }
                                        let credentials = JSON.parse(coontent);
                                        let clientSecret = credentials.installed.client_secret;
                                        let clientId = credentials.installed.client_id;
                                        let redirectUrl = credentials.installed.redirect_uris[0];

                                        let OAuth2 = google.auth.OAuth2;
                                        let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                                        oauth2Client.credentials = tokenInfo;
                                        // let watch = await historyListapi(oauth2Client, historyID);
                                        var options = {
                                            userId: 'me',
                                            'startHistoryId': historyID,
                                            // 'pageToken': nextPageToken,
                                            auth: oauth2Client

                                        };

                                        gmail.users.history.list(options, async function (err, res) {
                                            if (err) {
                                                return;
                                            }
                                            let data = res.data;

                                            if (data && data.history) {
                                                let history = data.history;
                                                let messageIDS = [];
                                                history.forEach(his => {
                                                    his.messages.forEach(msg => {
                                                        messageIDS.push(msg.id)
                                                    });
                                                });
                                                console.log(messageIDS)
                                                getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                                                response.status(200).json({
                                                    error: false,
                                                    data: messageIDS
                                                })
                                            } else if (data && !data.history) {
                                                response.status(200).json({
                                                    error: false,
                                                    data: "no msg ids"
                                                })
                                            }

                                        });
                                    });

                            } else {
                                console.log("expire")
                                // let content = await fs.readFileSync('./client_secret.json');
                                fs.readFile('./client_secret.json',
                                    async function processClientSecrets(err, content) {
                                        if (err) {
                                            console.log('Error loading client secret file: ' + err);
                                            return;
                                        }
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

                                        Request(settings, (error, resp, body) => {
                                            if (error) {
                                                return console.log(error);
                                            }
                                            if (body) {
                                                body = JSON.parse(body);
                                                // console.log(body);
                                                let milisec = new Date().getTime();
                                                console.log(milisec)
                                                console.log(body.expires_in)
                                                console.log(new Date(milisec))
                                                milisec = milisec + (body.expires_in * 1000);
                                                console.log(milisec)
                                                console.log(new Date(milisec))
                                                tokenInfo.accessToken = body.access_token;
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
                                                auth_token.updateOne(oldvalue, newvalues, upsert, async function (err, result) {
                                                    if (result) {
                                                        console.log(result)
                                                        // fs.readFile('./client_secret.json',
                                                        //     async function processClientSecrets(err, coontent) {
                                                        //         if (err) {
                                                        //             console.log('Error loading client secret file: ' + err);
                                                        //             return;
                                                        //         }
                                                        //         let credentials = JSON.parse(coontent);
                                                        // let clientSecret = credentials.installed.client_secret;
                                                        // let clientId = credentials.installed.client_id;
                                                        let redirectUrl = cred.installed.redirect_uris[0];

                                                        let OAuth2 = google.auth.OAuth2;
                                                        let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
                                                        oauth2Client.credentials = tokenInfo;
                                                        console.log(oauth2Client)
                                                        // let watch = await historyListapi(oauth2Client, historyID);
                                                        var options = {
                                                            userId: 'me',
                                                            'startHistoryId': historyID,
                                                            // 'pageToken': nextPageToken,
                                                            auth: oauth2Client
                                                        };

                                                        gmail.users.history.list(options, async function (err, res) {
                                                            if (err) {
                                                                return;
                                                            }
                                                            let data = res.data;

                                                            if (data && data.history) {
                                                                let history = data.history;
                                                                let messageIDS = [];
                                                                history.forEach(his => {
                                                                    his.messages.forEach(msg => {
                                                                        messageIDS.push(msg.id)
                                                                    });
                                                                });
                                                                console.log(messageIDS)
                                                                getRecentEmail(doc._id, oauth2Client, messageIDS, null);
                                                                response.status(200).json({
                                                                    error: false,
                                                                    data: messageIDS
                                                                })
                                                            } else if (data && !data.history) {
                                                                response.status(200).json({
                                                                    error: false,
                                                                    data: "no msg ids"
                                                                })
                                                            }
                                                        });
                                                        // });
                                                    }
                                                });
                                            }
                                        });
                                    });
                            }
                        }
                    })
                }
            }
        );
    } catch (ex) {

    }

});


async function getRecentEmail(user_id, auth, messageIDS, nextPageToken) {
    messageIDS.forEach(mids => {
        gmail.users.messages.get({ auth: auth, userId: 'me', 'id': mids }, async function (err, response) {
            if (err) {
                console.log('The API returned an error getting: ' + err);
                return;
            }
            // console.log(response.data)
            let header_raw = response['data']['payload']['headers'];
            // console.log(header_raw)
            let head;
            header_raw.forEach(data => {
                if (data.name == "Subject") {
                    head = data.value
                    // console.log(head)
                }
            });
            if (response.data.payload) {
                let message_raw = response.data.payload.parts[0].body.data;
                let data = message_raw;
                buff = new Buffer(data, 'base64');
                text = buff.toString();
                simpleParser(text, (err, parsed) => {
                    if (parsed) {
                        if (parsed['text']) {
                            checkEmail(parsed['text'], response['data'], user_id, auth);
                        }
                        if (parsed['headerLines']) {
                            checkEmail(parsed.headerLines[0].line, response['data'], user_id, auth);
                        }
                        if (parsed['textAsHtml']) {
                            checkEmail(parsed['textAsHtml'], response['data'], user_id, auth);
                        }
                    }
                });
            }

        });

    });
}



let checkEmail = (emailObj, mail, user_id, auth) => {
    $ = cheerio.load(emailObj)
    let url = null;
    let emailInfo = {};

    $('a').each(function (i, elem) {
        let fa = $(this).text();
        if (fa.toLowerCase().indexOf("unsubscribe") != -1 || $(this).parent().text().toLowerCase().indexOf("unsubscribe") != -1) {
            url = $(this).attr().href;
            // console.log($(this).attr().href)
        }
    })
    if (url != null) {
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = mail
        emailInfo['email_id'] = mail.id;
        emailInfo['historyId'] = mail.historyId;
        emailInfo['labelIds'] = mail.labelIds;
        emailInfo['unsubscribe'] = url;
        emailInfo['is_moved'] = false;
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
            email.findOne({ "email_id": emailInfo.email_id }, function (err, doc) {
                if (err) {
                    console.log(err)
                }
                if (!doc) {
                    email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }, function (err, doc) {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(doc)
                            console.log(emailInfo)
                            email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true },
                                function (err, mailList) {
                                    if (mailList) {
                                        getListLabel(user_id, auth, mailList)
                                    }
                                });
                        }
                    });
                }
            });
        } catch (err) {
            console.log(err)
        }
    }
}


let getListLabel = async (user_id, auth, mailList) => {
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.labels.list({
        userId: 'me',
    }, async (err, res) => {
        if (err) return console.log('The API returned an error for label: ' + err);
        if (res) {
            console.log(res.data);
            let lbl_id = null;
            res.data.labels.forEach(lbl => {
                console.log(lbl.name)
                if (lbl.name === "ExpenseBit") {
                    lbl_id = lbl.id;
                }
            });
            console.log(lbl_id);
            if (lbl_id == null) {
                gmail.users.labels.create({
                    userId: 'me',
                    resource: {
                        "labelListVisibility": "labelShow",
                        "messageListVisibility": "show",
                        "name": "ExpenseBit"
                    }
                }, async (err, res) => {
                    if (err) return console.log('The API returned an error for label: ' + err);
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
                        auth_token.updateOne(oldvalue, newvalues, upsert, async function (err, result) {
                            if (result) {
                                console.log(result);
                                // return result;
                                let watch = await watchapi(user_id, auth);
                                await MoveMailFromInBOX(user_id, auth, mailList, res.data.id);
                            }
                        });
                    }
                });
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
                auth_token.updateOne(oldvalue, newvalues, upsert, async function (err, result) {
                    if (result) {
                        console.log(result);
                        // return result;
                        await MoveMailFromInBOX(user_id, auth, mailList, lbl_id);
                    }
                });
            }
        }
    });
}



async function MoveMailFromInBOX(user_id, auth, mailList, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    var oldvalue = {
        user_id: user_id,
        "from_email": mailList.from_email
    };
    var newvalues = {
        $set: {
            "is_moved": true
        }
    };
    var upsert = {
        upsert: true
    };
    email.updateMany(oldvalue, newvalues, upsert, function (err, result) {
        if (result) {
            console.log(result);
        }
    });
    console.log(label)
    let labelarry = [];
    labelarry[0] = label;
    console.log(labelarry)
    if (mailList.email_id) {
        gmail.users.messages.modify({
            userId: 'me',
            'id': mailList.email_id,
            resource: {
                'addLabelIds': labelarry,
            }
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            if (res) {
                console.log(res);
            }
        });
    }
}


let historyListapi = async (oauth2Client, historyID) => {
    var options = {
        userId: 'me',
        'startHistoryId': historyID,
        // 'pageToken': nextPageToken,
        auth: oauth2Client
    };
    gmail.users.history.list(options, async function (err, res) {
        if (err) {
            return;
        }
        console.log(res.data)
        let data = res.data;
        if (data && data.history) {
            let history = data.history;
            history.forEach(his => {
                console.log(his.messages)
                his.messages.forEach(msg => {
                    console.log(msg.id)
                });
            });
        }
    });
}

module.exports = router