var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let token_model = require('../models/token');
let Request = require("request");
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio');
const simpleParser = require('mailparser').simpleParser;

var gmail = google.gmail('v1');


router.post('/deleteMailFromInbox', async (req, res) => {
    try {
        console.log("Move Email Called");
        console.log(req.body);
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let emailIDS = req.body.emailIDS;
        console.log(auth_id, from_email, emailIDS);
        token_model.findOne({ "token": auth_id },
            async function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                    auth_token.findOne({ "user_id": doc.user_id }, async function (err, tokenInfo) {
                        if (err) {
                            console.log(err);
                        }
                        if (tokenInfo) {
                            console.log(tokenInfo);
                            // let labelInfo = await getLabelFromEmail(doc.user_id,tokenInfo,tokenInfo.label_id)
                            checkTokenLifetime(doc.user_id, tokenInfo, from_email, emailIDS);
                            res.status(200).json({
                                error: false,
                                data: "moving"
                            })

                        }
                    })
                }
            }
        );
    } catch (ex) {

    }
});


router.post('/moveEmailToExpbit', async (req, res) => {
    try {
        console.log("Move Email Called");
        console.log(req.body);
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let is_unscubscribe = req.body.is_unscubscribe;
        let is_remove_all = req.body.is_remove_all;
        console.log(auth_id, from_email, is_unscubscribe, is_remove_all);
        token_model.findOne({ "token": auth_id },
            async function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                    auth_token.findOne({ "user_id": doc.user_id }, async function (err, tokenInfo) {
                        if (err) {
                            console.log(err);
                        }
                        if (tokenInfo) {
                            console.log(tokenInfo);
                            // let labelInfo = await getLabelFromEmail(doc.user_id,tokenInfo,tokenInfo.label_id)
                            check_Token_info(doc.user_id, tokenInfo, from_email, tokenInfo.label_id, is_unscubscribe, is_remove_all);
                            res.status(200).json({
                                error: false,
                                data: "moving"
                            })

                        }
                    })
                }
            }
        );
    } catch (ex) {

    }
});


router.post('/checkLabelInformation', async (req, res) => {
    try {
        console.log("Move Email Called");
        console.log(req.body);
        let auth_id = req.body.authID;
        console.log(auth_id);
        token_model.findOne({ "token": auth_id },
            async function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                    auth_token.findOne({ "user_id": doc.user_id }, async function (err, tokenInfo) {
                        if (err) {
                            console.log(err);
                        }
                        if (tokenInfo) {
                            console.log(tokenInfo);
                            let labelInfo = await getLabelFromEmail(doc.user_id, tokenInfo, tokenInfo.label_id)
                        }
                    })
                }
            }
        );
    } catch (ex) {

    }
})

let getLabelFromEmail = async (user_id, token, from_email, label_id, is_unscubscribe, is_remove_all) => {
    fs.readFile('./client_secret.json',
        async function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            console.log(token);
            let credentials = JSON.parse(content);
            console.log(credentials);
            let clientSecret = credentials.installed.client_secret;
            let clientId = credentials.installed.client_id;
            let redirectUrl = credentials.installed.redirect_uris[0];

            let OAuth2 = google.auth.OAuth2;
            let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            oauth2Client.credentials = token;
            // let watch = await watchapi(user_id,oauth2Client);
            let labelInfo = await getListLabel(user_id, oauth2Client, from_email, is_unscubscribe, is_remove_all);
            console.log(labelInfo);
        });
}

let watchapi = (user_id, oauth2Client) => {
    var options = {
        userId: 'me',
        auth: oauth2Client,
        resource: {
            labelIds: ["INBOX", "CATEGORY_PROMOTIONS", "UNREAD"],
            topicName: 'projects/retail-1083/topics/subscribeMail'
        }
    };

    gmail.users.watch(options, function (err, res) {
        if (err) {
            // doSomething here;
            return;
        }
        console.log(res)
        // doSomething here;
    });
}


let getListLabel = async (user_id, auth, from_email, is_unscubscribe, is_remove_all) => {
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
                                console.log(is_unscubscribe, is_remove_all)
                                let watch = await watchapi(user_id, auth);
                                if (is_remove_all) {
                                    await MoveAllMailFromInBOX(user_id, auth, from_email, res.data.id);
                                } else if (is_unscubscribe) {
                                    await MoveMailFromExpenseBit(user_id, auth, from_email, res.data.id);
                                } else {
                                    await MoveMailFromInBOX(user_id, auth, from_email, res.data.id);
                                }
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
                        console.log(is_unscubscribe)
                        console.log(is_unscubscribe, is_remove_all)
                        if (is_remove_all) {
                            await MoveAllMailFromInBOX(user_id, auth, from_email, lbl_id);
                        } else if (is_unscubscribe) {
                            await MoveMailFromExpenseBit(user_id, auth, from_email, lbl_id);
                        } else {
                            await MoveMailFromInBOX(user_id, auth, from_email, lbl_id);
                        }
                    }
                });
            }

        }

    });
}


router.post('/getMailInfo', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        console.log(auth_id);
        token_model.findOne({ "token": auth_id },
            async function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                    auth_token.findOne({ "user_id": doc.user_id }, async function (err, tokenInfo) {
                        if (err) {
                            console.log(err);
                        }
                        if (tokenInfo) {
                            console.log(tokenInfo);
                            let mailData = await extract_token(doc.user_id, tokenInfo);
                            res.status(200).json({
                                error: false,
                                data: "scrape"
                            })

                        }
                    })
                }
            }
        );
    } catch (ex) {

    }
});



router.post('/readMailInfo', async (req, res) => {
    console.log("get api called");
    try {
        let auth_id = req.body.authID;
        token_model.findOne({ "token": auth_id },
            function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    if (doc) {
                        console.log(doc.user_id);
                        email.aggregate([{ $match: { "is_moved": false, "user_id": doc.user_id } }, {
                            $group: {
                                _id: { "from_email": "$from_email" }, data: {
                                    $push: {
                                        "labelIds": "$labelIds",
                                        "subject": "$subject",
                                        "url": "$unsubscribe",
                                        "email_id": "$email_id",
                                        "history_id": "$historyId",
                                        "from_email_name": "$from_email_name"
                                    }
                                }, count: { $sum: 1 }
                            }
                        },
                        { $sort: { "count": -1 } },

                        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }],
                            function (err, emailinfos) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(emailinfos);
                                    email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_moved": false, "user_id": doc.user_id } },
                                    { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
                                    { $project: { "count": 1 } }],
                                        function (err, unreademail) {
                                            let unreadData = {};
                                            if (unreademail) {
                                                unreademail.forEach(element => {
                                                    unreadData[element._id.from_email] = element.count
                                                });
                                                email.find({ 'user_id': doc.user_id }, function (err, allEmail) {
                                                    console.log(allEmail.length);
                                                    res.status(200).json({
                                                        error: false,
                                                        data: emailinfos,
                                                        unreadData: unreadData,
                                                        totalEmail: allEmail.length
                                                    })
                                                });

                                            }
                                        });
                                }
                            }
                        );
                    }
                }
            });
    } catch (err) {
        console.log(err);
    }
});



router.post('/readProfileInfo', async (req, res) => {
    console.log("get api called");
    try {
        let auth_id = req.body.authID;
        token_model.findOne({ "token": auth_id },
            function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    if (doc) {
                        console.log(doc.user_id);
                        email.aggregate([{ $match: { "user_id": doc.user_id } }, {
                            $group: {
                                _id: { "from_email": "$from_email" }, data: {
                                    $push: {
                                        "labelIds": "$labelIds",
                                        "subject": "$subject",
                                        "url": "$unsubscribe",
                                        "email_id": "$email_id",
                                        "history_id": "$historyId",
                                        "from_email_name": "$from_email_name"
                                    }
                                }, count: { $sum: 1 }
                            }
                        },
                        { $sort: { "count": -1 } },
                        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }],
                            function (err, emailinfos) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(emailinfos);

                                    email.aggregate([{ $match: { "is_moved": true, "user_id": doc.user_id } }, {
                                        $group: {
                                            _id: { "from_email": "$from_email" }, data: {
                                                $push: {
                                                    "labelIds": "$labelIds",
                                                    "subject": "$subject",
                                                    "url": "$unsubscribe",
                                                    "email_id": "$email_id",
                                                    "history_id": "$historyId",
                                                    "from_email_name": "$from_email_name"
                                                }
                                            }, count: { $sum: 1 }
                                        }
                                    },
                                    { $sort: { "count": -1 } },
                                    { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }],
                                        function (err, movedMail) {
                                            if (movedMail) {
                                                res.status(200).json({
                                                    error: false,
                                                    data: emailinfos,
                                                    moveMail: movedMail
                                                })

                                            }
                                        });
                                }
                            }
                        );
                    }
                }
            });
    } catch (err) {
        console.log(err);
    }
});


router.post('/getUnsubscribeMailInfo', async (req, res) => {
    console.log("get api called");
    try {
        let auth_id = req.body.authID;
        token_model.findOne({ "token": auth_id },
            function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    if (doc) {
                        console.log(doc.user_id);
                        email.aggregate([{ $match: { "is_moved": true, "user_id": doc.user_id } }, {
                            $group: {
                                _id: { "from_email": "$from_email" }, data: {
                                    $push: {
                                        "labelIds": "$labelIds",
                                        "subject": "$subject",
                                        "url": "$unsubscribe",
                                        "email_id": "$email_id",
                                        "history_id": "$historyId",
                                        "from_email_name": "$from_email_name"
                                    }
                                }, count: { $sum: 1 }
                            }
                        },
                        { $sort: { "count": -1 } },

                        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }],
                            function (err, emailinfos) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(emailinfos);
                                    email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_moved": true, "user_id": doc.user_id } },
                                    { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
                                    { $project: { "count": 1 } }],
                                        function (err, unreademail) {
                                            let unreadData = {};
                                            if (unreademail) {
                                                unreademail.forEach(element => {
                                                    unreadData[element._id.from_email] = element.count
                                                });
                                                email.find({ 'user_id': doc.user_id }, function (err, allEmail) {
                                                    console.log(allEmail.length);
                                                    res.status(200).json({
                                                        error: false,
                                                        data: emailinfos,
                                                        unreadData: unreadData,
                                                        totalEmail: allEmail.length
                                                    })
                                                });

                                            }
                                        });
                                }
                            }
                        );
                    }
                }
            });
    } catch (err) {
        console.log(err)
    }
});



let getMailInfo = async (user_id, token) => {
    fs.readFile('./client_secret.json',
        async function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            let credentials = JSON.parse(content);
            let clientSecret = credentials.installed.client_secret;
            let clientId = credentials.installed.client_id;
            let redirectUrl = credentials.installed.redirect_uris[0];

            let OAuth2 = google.auth.OAuth2;
            let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            var myDate = new Date(token.expiry_date);
            var mili = myDate.getTime();
            let tokenadd = {
                access_token: token.access_token,
                token_type: token.token_type,
                refresh_token: token.refresh_token,
                expiry_date: mili
            }
            oauth2Client.credentials = tokenadd;
            createEmailLabel(user_id, oauth2Client);
            let mailData = await getRecentEmail(user_id, oauth2Client, null);
            if (mailData) {
                return mailData;
            }
        }
    );
}


let moveToExpensebit = (user_id, token, from_email, label) => {
    fs.readFile('./client_secret.json',
        async function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            console.log(token);
            let credentials = JSON.parse(content);
            console.log(credentials);
            let clientSecret = credentials.installed.client_secret;
            let clientId = credentials.installed.client_id;
            let redirectUrl = credentials.installed.redirect_uris[0];

            let OAuth2 = google.auth.OAuth2;
            let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            oauth2Client.credentials = token;
            MoveMailFromInBOX(user_id, oauth2Client, from_email, label);
        }
    );
}



async function MoveMailFromExpenseBit(user_id, auth, from_email, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    email.find({ "from_email": from_email },
        function (err, mailList) {
            let allLabels = [];
            let mailLBL = [];
            if (mailList[0].labelIds) {
                mailLBL = mailList[0].labelIds.split(",");
            }
            mailLBL.forEach(lblmail => {
                if (lblmail != label) {
                    allLabels.push(lblmail);
                }
            });
            console.log(allLabels);
            var oldvalue = {
                user_id: user_id,
                "from_email": from_email,
                "is_moved": true
            };
            var newvalues = {
                $set: {
                    "is_moved": false
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
            // console.log(label)
            let labelarry = [];
            labelarry[0] = label;
            console.log(labelarry)
            mailList.forEach(oneEmail => {
                if (oneEmail.email_id) {
                    gmail.users.messages.modify({
                        userId: 'me',
                        'id': oneEmail.email_id,
                        resource: {
                            'addLabelIds': allLabels,
                            "removeLabelIds": labelarry
                        }
                    }, (err, res) => {
                        if (err) return console.log('The API returned an error: ' + err);
                        if (res) {
                            console.log(res.data);
                        }
                    });
                }
            });
        });
}


async function MoveAllMailFromInBOX(user_id, auth, from_email, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    email.find({ "user_id": user_id, "is_moved": false },
        function (err, mailList) {
            var oldvalue = {
                user_id: user_id,
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
            email.updateMany(oldvalue, newvalues, upsert, function (err, result) {
                if (result) {
                    console.log(result);
                }
            });
            // console.log(label)
            let labelarry = [];
            labelarry[0] = label;
            console.log(labelarry)
            mailList.forEach(async oneEmail => {
                // let allLabels = [];
                // let mailLBL = oneEmail.labelIds.split(",");

                if (oneEmail.email_id) {
                    // mailLBL.forEach(async lblmail => {
                    //     if (lblmail != label) {
                    //         allLabels.push(lblmail);
                    //     }
                    // });
                    console.log(oneEmail.main_label);
                    gmail.users.messages.modify({
                        userId: 'me',
                        'id': oneEmail.email_id,
                        resource: {
                            'addLabelIds': labelarry,
                            "removeLabelIds": oneEmail.main_label
                        }
                    }, async (err, res) => {
                        if (err) return console.log('The API returned an error: ' + err);
                        if (res) {
                            console.log("scuess all")
                            console.log(res.data);
                        }
                    });
                    sleep(2000);
                }
            });
        });
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function MoveMailFromInBOX(user_id, auth, from_email, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    email.find({ "from_email": from_email },
        function (err, mailList) {
            let allLabels = [];

            let mailLBL = mailList[0].labelIds.split(",");
            mailLBL.forEach(lblmail => {
                if (lblmail != label) {
                    allLabels.push(lblmail);
                }
            });
            console.log(allLabels);
            var oldvalue = {
                user_id: user_id,
                "from_email": from_email,
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
            email.updateMany(oldvalue, newvalues, upsert, function (err, result) {
                if (result) {
                    console.log(result);
                }
            });
            // console.log(label)
            let labelarry = [];
            labelarry[0] = label;
            // console.log(labelarry)
            mailList.forEach(oneEmail => {
                if (oneEmail.email_id) {
                    gmail.users.messages.modify({
                        userId: 'me',
                        'id': oneEmail.email_id,
                        resource: {
                            'addLabelIds': labelarry,
                            "removeLabelIds": allLabels
                        }
                    }, (err, res) => {
                        if (err) return console.log('The API returned an error: ' + err);
                        if (res) {
                            console.log("scuess")
                            // console.log(res);
                        }
                    });
                }
            });
        });
}


// /**
//  * Get the recent email from your Gmail account
//  *
//  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//  */

function createEmailLabel(user_id, auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.labels.create({
        userId: 'me',
        resource: {
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
            "name": "ExpenseBit"
        }
    }, (err, res) => {
        if (err) return console.log('The API returned an error for label: ' + err);
        if (res) {
            console.log(res.data);
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
            auth_token.updateOne(oldvalue, newvalues, upsert, function (err, result) {
                if (result) {
                    console.log(result);
                }
            });
        }

    });
}

/**
 * Get the recent email from your Gmail account
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getRecentEmail(user_id, auth, nextPageToken) {
    // gmail.get
    gmail.users.messages.list({ auth: auth, userId: 'me', includeSpamTrash: true, maxResults: 100, 'pageToken': nextPageToken, q: 'after:2018/12/01' }, async function (err, response) {
        if (err) {
            console.log('The API returned an error: unknown list msg' + err);
            return;
        }
        response['data']['messages'].forEach(element => {
            gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] }, async function (err, response) {
                if (err) {
                    console.log('The API returned an error getting: ' + err);
                    return;
                }
                
                let header_raw = response['data']['payload']['headers'];
                let head;
                header_raw.forEach(data => {
                    if (data.name == "Subject") {
                        head = data.value
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
                                checkEmail(parsed['text'], response['data'], user_id);
                            }
                            if (parsed['headerLines']) {
                                checkEmail(parsed.headerLines[0].line, response['data'], user_id);
                            }
                            if (parsed['textAsHtml']) {
                                checkEmail(parsed['textAsHtml'], response['data'], user_id);
                            }
                        }
                    });
                }
            });
        });
        nextPageToken = response['data'].nextPageToken;
        if (response['data'].nextPageToken) {
            await getRecentEmail(user_id, auth, response['data'].nextPageToken);
        }
    });
}



let checkEmail = (emailObj, mail, user_id) => {
    $ = cheerio.load(emailObj);
    let url = null;
    let emailInfo = {};
    $('a').each(function (i, elem) {
        let fa = $(this).text();
        if (fa.toLowerCase().indexOf("unsubscribe") != -1 || $(this).parent().text().toLowerCase().indexOf("unsubscribe") != -1 ||
            $(this).text().toLowerCase().indexOf("do not wish to receive our mails") != -1) {
            url = $(this).attr().href;
            console.log($(this).attr().href);
        }
    })
    // if(url == null){
    // $('span').each(function (i, elem) {
    //     if ($(this).text().toLowerCase().indexOf("unsubscribe") != -1) {
    //         console.log($(this).html())
    //         // console.log($(this).children('a').attr().href)
    //         url = $(this).children('a').attr().href
    //         console.log(url)
    //     }
    // })
    // }
    if (url != null) {

        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = mail
        emailInfo['email_id'] = mail.id;
        emailInfo['historyId'] = mail.historyId;
        emailInfo['labelIds'] = mail.labelIds;
        emailInfo['unsubscribe'] = url;
        emailInfo['main_label'] = mail.labelIds;
        emailInfo['is_moved'] = false;
        emailInfo['is_delete'] = false;
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
                    console.log(err);
                }
                if (!doc) {
                    email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }, function (err, doc) {
                        if (err) {
                            console.log(err);
                        } else {
                        }
                    }
                    );
                }
            }
            );
        } catch (err) {
            console.log(err);
        }
    }
}



async function check_Token_info(user_id, tokenInfo, from_email, label, is_unscubscribe, is_remove_all) {
    if (new Date(tokenInfo.expiry_date) >= new Date()) {
        getLabelFromEmail(user_id, tokenInfo, from_email, label, is_unscubscribe, is_remove_all);
    } else {
        let content = await fs.readFileSync('./client_secret.json');
        let cred = JSON.parse(content);
        let clientSecret = cred.installed.client_secret;
        let clientId = cred.installed.client_id;
        var body = JSON.stringify({
            "client_id": clientId,
            "client_secret": clientSecret,
            "refresh_token": tokenInfo.refresh_token,
            "grant_type": 'refresh_token'
        });


        var settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            body: body,
            "headers": {
                'Content-Type': 'application/json',
            }
        }

        Request(settings, (error, response, body) => {
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
                    user_id: user_id
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
                auth_token.updateOne(oldvalue, newvalues, upsert, function (err, result) {
                    if (result) {
                        console.log(result);
                        getLabelFromEmail(user_id, tokenInfo, from_email, label, is_unscubscribe, is_remove_all);
                    }
                });
            }
        });
    }
}

async function extract_token(user_id, tokenInfo) {
    if (tokenInfo.expiry_date >= new Date()) {
        tokenInfo.expiry_date = tokenInfo.expiry_date.getTime();
        let mailData = await getMailInfo(user_id, tokenInfo);
        if (mailData) {
            return mailData;
        }
    } else {
        console.log("expire")
        let content = await fs.readFileSync('./client_secret.json');
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

        Request(settings, (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                body = JSON.parse(body);
                console.log(body);
                let milisec = new Date().getTime();
                milisec = milisec + (body.expires_in * 1000);
                tokenInfo.accessToken = body.access_token;
                tokenInfo.expiry_date = new Date(milisec);
                var oldvalue = {
                    user_id: user_id
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
                        let mailData = await getMailInfo(user_id, tokenInfo);
                        if (mailData) {
                            return mailData;
                        }
                    }
                });
            }
        });
    }
}


router.post('/unSubscribeMail', async (req, res) => {
    try {
        console.log("Unsubscribe Called");
        console.log(req.body);
        let from_email = req.body.from_email;
        console.log(from_email);
        email.findOne({ "from_email": from_email },
            function (err, mailList) {
                console.log(mailList.unsubscribe);
                var settings = {
                    "url": mailList.unsubscribe,
                    "method": "get"
                }
                console.log(settings);
                Request(settings, (error, response, body) => {
                    if (error) {
                        return console.log(error);
                    }
                    if (response) {
                        console.log(response);
                    }
                    if (body) {
                        console.log(body);
                    }
                });
            });
    } catch (ex) {

    }
});



async function checkTokenLifetime(user_id, tokenInfo, from_email, emailIDS) {
    if (new Date(tokenInfo.expiry_date) >= new Date()) {
        getAllEmailIds(user_id, tokenInfo, from_email, emailIDS);
    } else {
        let content = await fs.readFileSync('./client_secret.json');
        let cred = JSON.parse(content);
        let clientSecret = cred.installed.client_secret;
        let clientId = cred.installed.client_id;
        var body = JSON.stringify({
            "client_id": clientId,
            "client_secret": clientSecret,
            "refresh_token": tokenInfo.refresh_token,
            "grant_type": 'refresh_token'
        });


        var settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            body: body,
            "headers": {
                'Content-Type': 'application/json',
            }
        }

        Request(settings, (error, response, body) => {
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
                    user_id: user_id
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
                auth_token.updateOne(oldvalue, newvalues, upsert, function (err, result) {
                    if (result) {
                        console.log(result);
                        getAllEmailIds(user_id, tokenInfo, from_email, emailIDS);
                    }
                });
            }
        });
    }
}


let getAllEmailIds = async (user_id, token, from_email, emailIDS) => {
    fs.readFile('./client_secret.json',
        async function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            console.log(token);
            let credentials = JSON.parse(content);
            console.log(credentials);
            let clientSecret = credentials.installed.client_secret;
            let clientId = credentials.installed.client_id;
            let redirectUrl = credentials.installed.redirect_uris[0];
            let OAuth2 = google.auth.OAuth2;
            let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            oauth2Client.credentials = token;
            // let watch = await watchapi(user_id,oauth2Client);
            let mail = await deleteAllEmailsAndMoveToTrash(user_id, oauth2Client, from_email, emailIDS);
            console.log(mail);
        });
}


async function deleteAllEmailsAndMoveToTrash(user_id, auth, from_email, emailIDS) {
    const gmail = google.gmail({ version: 'v1', auth });

    if (emailIDS.length != 0) {

        var upsert = {
            upsert: true
        };
        emailIDS.forEach(emid => {
            var oldvalue = {
                user_id: user_id,
                "email_id": emid,
                "is_delete": false
            };
            var newvalues = {
                $set: {
                    "is_delete": true
                }
            };
            email.updateOne(oldvalue, newvalues, upsert, function (err, result) {
                if (result) {
                    console.log(result);
                }
            });
        });


        console.log(emailIDS)
        emailIDS.forEach(email_singleid => {
            console.log(email_singleid)
            // gmail.users.messages.delete({
            //     userId: 'me',
            //     'id': email_singleid
            // }, (err, res) => {
            //     if (err) return console.log('The API returned an error: ' + err);
            //     if (res) {
            //         console.log("deleted email")
            //     }
            // });    
        });

    } else {
        email.find({ "from_email": from_email },
            function (err, mailList) {
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
                        "labelIds": "TRASH"
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
                console.log(mailIds)
                let allLabels = ["TRASH"];
                mailIds.forEach(mailid => {
                    gmail.users.messages.modify({
                        userId: 'me',
                        'id': mailid,
                        resource: {
                            'addLabelIds': allLabels
                        }
                    }, (err, res) => {
                        if (err) return console.log('The API returned an error: ' + err);
                        if (res) {
                            console.log(res.data);
                        }
                    });
                });
            });
    }

}

async function deleteAllEmails(user_id, auth, from_email) {
    const gmail = google.gmail({ version: 'v1', auth });
    email.find({ "from_email": from_email },
        function (err, mailList) {
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
            email.updateMany(oldvalue, newvalues, upsert, function (err, result) {
                if (result) {
                    console.log(result);
                }
            });
            console.log(mailIds)
            mailIds.forEach(mailid => {
                gmail.users.messages.delete({
                    userId: 'me',
                    'id': mailid
                }, (err, res) => {
                    if (err) return console.log('The API returned an error: ' + err);
                    if (res) {
                        console.log("deleted email")
                        // console.log(res);
                    }
                });
            });
        });
}



router.post('/getDeletedEmailData', async (req, res) => {
    console.log("get api called");
    try {
        let auth_id = req.body.authID;
        token_model.findOne({ "token": auth_id },
            function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    if (doc) {
                        console.log(doc.user_id);
                        email.aggregate([{ $match: { $text: { $search: "TRASH" }, "is_delete": false, "user_id": doc.user_id } }, {
                            $group: {
                                _id: { "from_email": "$from_email" }, data: {
                                    $push: {
                                        "labelIds": "$labelIds",
                                        "subject": "$subject",
                                        "url": "$unsubscribe",
                                        "email_id": "$email_id",
                                        "history_id": "$historyId",
                                        "from_email_name": "$from_email_name"
                                    }
                                }, count: { $sum: 1 }
                            }
                        },
                        { $sort: { "count": -1 } },
                        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }],
                            function (err, emailinfos) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(emailinfos);
                                    res.status(200).json({
                                        error: false,
                                        data: emailinfos
                                    })

                                }
                            }
                        );
                    }
                }
            });
    } catch (err) {
        console.log(err)
    }
});



router.post('/setMailForDeleteFromInbox', async (req, res) => {
    console.log("Email Delete Set api called");
    try {
        console.log("Move Email Called");
        console.log(req.body);
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        console.log(auth_id, from_email);
        token_model.findOne({ "token": auth_id },
            async function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                    var oldvalue = {
                        user_id: doc.user_id,
                        "from_email": from_email
                    };
                    var newvalues = {
                        $set: {
                            "set_deleted_at": new Date(new Date().getTime() + (86400 * 1000 * 2))
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
                    // auth_token.findOne({ "user_id": doc.user_id }, async function (err, tokenInfo) {
                    //     if (err) {
                    //         console.log(err);
                    //     }
                    //     if (tokenInfo) {
                    //         console.log(tokenInfo);
                    //         // let labelInfo = await getLabelFromEmail(doc.user_id,tokenInfo,tokenInfo.label_id)
                    //         checkTokenLifetime(doc.user_id, tokenInfo, from_email);
                    //         res.status(200).json({
                    //             error: false,
                    //             data: "moving"
                    //         })

                    //     }
                    // })
                }
            }
        );
    } catch (ex) {
    }
});

module.exports = router

