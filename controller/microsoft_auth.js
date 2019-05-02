
let express = require('express');
let users = require('../models/user');
let auth_token = require('../models/authoToken');
let token_model = require('../models/tokeno');
let email = require('../models/emailDetails');
let emailInformation = require('../models/emailInfo');
let router = express.Router();
var uniqid = require('uniqid');
const jwt = require('jsonwebtoken');
const ExpenseBit = require("../helper/expenseBit").ExpenseBit;
const cheerio = require('cheerio');
var Request = require('request');
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}


const credentials = {
    client: {
        id: process.env.APP_ID,
        secret: process.env.APP_PASSWORD,
    },
    auth: {
        tokenHost: 'https://login.microsoftonline.com',
        authorizePath: 'common/oauth2/v2.0/authorize',
        tokenPath: 'common/oauth2/v2.0/token'
    }
};
const oauth2 = require('simple-oauth2').create(credentials);


router.get('/getOutLookApiUrl', async function (req, res) {
    console.log("came here for url")
    const stateCode = uniqid() + "outlook" + uniqid();
    const returnVal = oauth2.authorizationCode.authorizeURL({
        redirect_uri: process.env.REDIRECT_URI,
        scope: process.env.APP_SCOPES,
        state: stateCode
    });
    var user = new users({
        state: stateCode,
        email: stateCode,
        email_client: "outlook"
    });

    let newUser = await user.save().catch(err => {
        console.log(err);
    });
    res.status(200).json({
        error: false,
        data: returnVal
    })
});


router.post('/getMail', async function (req, resp, next) {
    console.log(req.body)
    let authCode = req.body.authID;
    let userInfo = await token_model.findOne({ token: authCode }).catch(e => console.error(e));
    let token = await auth_token.findOne({ "user_id": userInfo.user_id });
    let accessToken;
    if (token) {
        accessToken = await check_Token_info(userInfo.user_id, token);
    }
    if (accessToken) {
        var settings = {
            "url": "https://graph.microsoft.com/v1.0/me/mailFolders",
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                const res = JSON.parse(body);
                await res.value.asynForEach(async folder => {
                    if (folder.displayName == 'Inbox') {
                        let link = encodeURI('https://graph.microsoft.com/v1.0/me/mailFolders/' + folder.id + '/messages?$skip=0');
                        await getEmailInBulk(accessToken, link, userInfo.user_id);
                    }
                });
                resp.status(200).json({
                    error: false,
                    message: "scrapping"
                })
            }
        });

    } else {
        resp.status(404).json({
            error: false
        })
    }
});

async function getEmailInBulk(accessToken, link, user_id) {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            body = JSON.parse(body);
            let mailList = body.value;
            await mailList.asynForEach(async oneEmail => {
                await checkEmail(oneEmail, user_id, accessToken)
            });
            if (body['@odata.nextLink']) {
                await getEmailInBulk(accessToken, encodeURI(body['@odata.nextLink']), user_id);
            }
        }
    });
}

async function createFolderOutlook(accessToken, user_id) {
    var settings = {
        "url": "https://graph.microsoft.com/v1.0/me/mailFolders",
        "method": "POST",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        "body": JSON.stringify({ "displayName": "Unsubscribed Emails" })
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            if (res.id) {
                var oldvalue = {
                    user_id: user_id
                };
                var newvalues = {
                    $set: {
                        "label_id": res.id
                    }
                };
                var upsert = {
                    upsert: true
                };
                await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                    console.log(err);
                });
                return res.id;
            }
        }
    });
}


router.post('/moveEmailFromInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await getFolderList(accessToken, doc.user_id, link, from_email)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertMailToInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await getRevertMailFolderList(accessToken, doc.user_id, link, from_email, null, null)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await getRevertTrashMailFolderList(accessToken, doc.user_id, link, from_email, null, null)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});





router.post('/moveEmailToTrashFromInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await getFolderListForTrash(accessToken, doc.user_id, link, from_email)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

async function MoveSingleMailFromInBOX(accessToken, emailId, label_id) {

    var settings = {
        "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + emailId + "/move"),
        "method": "POST",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        "body": JSON.stringify({ "destinationId": label_id })
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            console.log("here")
            return
        }
    });
}

async function MoveMailFromInBOX(user_id, accessToken, from_email, label_id) {
    let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack); });
    let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack); });
    if (mailList) {
        let mailIDSARRAY = mailList.map(x => x.email_id);
        var oldvalue = {
            "from_email": from_email,
            "user_id": user_id
        };
        var newvalues = {
            $set: {
                "status": "move",
                "status_date": new Date()
            }
        };
        await email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.error(err.message, err.stack);
        });
        return await sendMailToBatchProcess(accessToken,mailIDSARRAY,label_id);
        // let batchRequest=[]
        // let count = 0;
        // await mailIDSARRAY.asynForEach(async email_id => {
        //     var settings = {
        //         "id":email_id,
        //         "url": encodeURI("/me/messages/" + email_id + "/move"),
        //         "method": "POST",
        //         "headers": {
        //             'Content-Type': 'application/json',
        //             'Authorization': 'Bearer ' + accessToken
        //         },
        //         "body": { "destinationId": label_id }
        //     }
        //     count++;
        //     batchRequest.push(settings);
        //     if(count==mailIDSARRAY.length){
        //         await sendRequestInBatch(accessToken,batchRequest)
        //     }

        //     // console.log(settings)

        //     // Request(settings, async (error, response, body) => {
        //     //     if (error) {
        //     //         return console.log(error);
        //     //     }
        //     //     if (response) {
        //     //         let resp = JSON.parse(response.body);
        //     //         if (resp && resp['id']) {

        //     //             var oldvalue = {
        //     //                 "email_id": email_id,
        //     //                 "from_email_id": mail._id
        //     //             };
        //     //             var newvalues = {
        //     //                 $set: {
        //     //                     "email_id": resp['id']
        //     //                 }
        //     //             };
        //     //             await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
        //     //                 console.error(err.message, err.stack);
        //     //             });
        //     //         }
        //     //     }
        //     // });
        // });
    }
}


async function sendMailToBatchProcess(accessToken,mailIds,label_id){
    console.log(mailIds.length);
    if (mailIds.length <= 0) return;
    var msgIDS = mailIds.splice(0, 18);
    var batchRequest=[];
    for(let i=0;i<msgIDS.length;i++){
        var settings = {
            "id": msgIDS[i],
            "url": encodeURI("/me/messages/" + msgIDS[i] + "/move"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": { "destinationId": label_id }
        }
        batchRequest.push(settings);
    }
    await sendRequestInBatch(accessToken,batchRequest)
    // let gmail = google.gmail({ version: 'v1', auth });
    // var resp = await gmail.users.messages.batchModify({
    //     userId: 'me',
    //     resource: {
    //         'ids': msgIDS,
    //         'addLabelIds': addLabels,
    //         "removeLabelIds": removeLabels
    //     }
    // }).catch(err => {
    //     console.error(err.message, err.stack);
    //     return
    // });
    // if (resp) {
    //     console.log(resp.status)
    // }
    return await sendMailToBatchProcess(accessToken,mailIds,label_id);
   
}
async function sendRequestInBatch(accessToken,reqArray) {
    var settings = {
        "url": encodeURI("https://graph.microsoft.com/v1.0/$batch"),
        "method": "POST",
        "headers": {
            'Content-Type': 'application/json',
             'Accept': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        "body": JSON.stringify({"requests":reqArray})
    }
    console.log(settings)

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (response) {
            console.log(JSON.parse(response.body))
            let rsp = JSON.parse(response.body);
            rsp.responses.forEach(element => {
                console.log(element.status)
            });
            // let resp = JSON.parse(response.body);
            // if (resp && resp['id']) {

            //     var oldvalue = {
            //         "email_id": email_id,
            //         "from_email_id": mail._id
            //     };
            //     var newvalues = {
            //         $set: {
            //             "email_id": resp['id']
            //         }
            //     };
            //     await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
            //         console.error(err.message, err.stack);
            //     });
            // }
        }
    });
}


async function trashSingleMailFromInBOX(accessToken, emailId, label_id) {
    var settings = {
        "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + emailId + "/move"),
        "method": "POST",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        "body": JSON.stringify({ "destinationId": label_id })
    }


    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            console.log("here")
        }
    });
}
async function MoveMailToTrashFromInBOX(user_id, accessToken, from_email, label_id) {
    let mail = await email.findOne({
        from_email: from_email,
        user_id: user_id
    }).catch(err => {
        console.error(err.message, err.stack);
    });
    let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack); });
    let mailIdList = mailList.map(x => x.email_id);
    var oldvalue = {
        from_email: from_email,
        user_id: user_id
    };
    var newvalues = {
        $set: {
            "status": "trash",
            "status_date": new Date()
        }
    };
    await email.updateOne(oldvalue, newvalues, { upsert: true }).catch(err => {
        console.error(err.message, err.stack);
    });
    await mailIdList.asynForEach(async email_id => {
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + email_id + "/move"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "destinationId": label_id })
        }


        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (response) {
                let resp = JSON.parse(response.body);
                if (resp && resp['id']) {

                    var oldvalue = {
                        "email_id": email_id,
                        "from_email_id": mail._id
                    };
                    var newvalues = {
                        $set: {
                            "email_id": resp['id']
                        }
                    };
                    await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                        console.error(err.message, err.stack);
                    });
                }
            }
        });
    });

}

let getFolderListForScrapping = async (accessToken, user_id, link, emailId) => {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Unsubscribed Emails') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await MoveSingleMailFromInBOX(accessToken, emailId, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getFolderListForScrapping(accessToken, user_id, res['@odata.nextLink'], emailId)
                } else {
                    let lbl = await createFolderOutlook(accessToken, user_id)
                    return await MoveSingleMailFromInBOX(accessToken, emailId, lbl);
                }
            }
        }
    });
}


let getFolderListForTrashScrapping = async (accessToken, user_id, link, emailId) => {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Junk Email') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await trashSingleMailFromInBOX(accessToken, emailId, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getFolderListForTrashScrapping(accessToken, user_id, res['@odata.nextLink'], emailId)
                }
            }
        }
    });
}

let getFolderList = async (accessToken, user_id, link, from_email) => {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Unsubscribed Emails') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await MoveMailFromInBOX(user_id, accessToken, from_email, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getFolderList(accessToken, user_id, res['@odata.nextLink'], from_email)
                } else {
                    let lbl = await createFolderOutlook(accessToken, user_id)
                    return await MoveMailFromInBOX(user_id, accessToken, from_email, lbl);
                }
            }
        }
    });
}


let getRevertMailFolderList = async (accessToken, user_id, link, from_email, source, dest) => {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.forEach(async folder => {

                count++;
                if (folder.displayName == 'Inbox') {

                    dest = folder.id;
                } else if (folder.displayName == 'Unsubscribed Emails') {

                    source = folder.id;
                }

                if (dest && source) {
                    return await RevertMailToInbox(user_id, accessToken, from_email, source, dest);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getRevertMailFolderList(accessToken, user_id, res['@odata.nextLink'], from_email, source, dest)
                }
            }
        }
    });
}

let getRevertTrashMailFolderList = async (accessToken, user_id, link, from_email, source, dest) => {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.forEach(async folder => {
                count++;
                if (folder.displayName == 'Inbox') {

                    dest = folder.id;
                } else if (folder.displayName == 'Junk Email') {
                    source = folder.id;
                }

                if (dest && source) {
                    return await RevertMailToInbox(user_id, accessToken, from_email, source, dest);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getRevertTrashMailFolderList(accessToken, user_id, res['@odata.nextLink'], from_email, source, dest)
                }
            }
        }
    });
}



async function RevertMailToInbox(user_id, accessToken, from_email, source, label_id) {
    let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack); });
    let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack); });
    if (mailList) {
        let mailIDSARRAY = mailList.map(x => x.email_id);
        var oldvalue = {
            "from_email": from_email,
            "user_id": user_id
        };
        var newvalues = {
            $set: {
                "status": "keep",
                "status_date": new Date()
            }
        };
        await email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.error(err.message, err.stack);
        });
        await mailIDSARRAY.asynForEach(async email_id => {
            var settings = {
                "url": encodeURI("https://graph.microsoft.com/v1.0/me/mailFolders/" + source + "/messages/" + email_id + "/move"),
                "method": "POST",
                "headers": {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                "body": JSON.stringify({ "destinationId": label_id })
            }
            // console.log(settings)

            Request(settings, async (error, response, body) => {
                if (error) {
                    return console.log(error);
                }
                if (response) {
                    // console.log(response.body)
                    let resp = JSON.parse(response.body);
                    if (resp && resp['id']) {

                        var oldvalue = {
                            "email_id": email_id,
                            "from_email_id": mail._id
                        };
                        var newvalues = {
                            $set: {
                                "email_id": resp['id']
                            }
                        };
                        await emailInformation.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                            console.error(err.message, err.stack);
                        });
                    }
                }
            });
        });
    }
}

let getFolderListForTrash = async (accessToken, user_id, link, from_email) => {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            const res = JSON.parse(body);
            let length = res.value.length;
            let count = 0;
            await res.value.asynForEach(async folder => {
                count++;
                if (folder.displayName == 'Junk Email') {
                    var oldvalue = {
                        user_id: user_id
                    };
                    var newvalues = {
                        $set: {
                            "label_id": folder.id
                        }
                    };
                    var upsert = {
                        upsert: true
                    };
                    await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                        console.log(err);
                    });
                    return await MoveMailToTrashFromInBOX(user_id, accessToken, from_email, folder.id);
                }
            });
            if (count == length) {
                if (res['@odata.nextLink']) {
                    await getFolderListForTrash(accessToken, user_id, res['@odata.nextLink'], from_email)
                }
            }
        }
    });
}


let check_Token_info = async (user_id, token) => {
    if (token) {
        const FIVE_MINUTES = 300000;
        const expiration = new Date(token.expiry_date);
        if (expiration > new Date()) {
            accessToken = token.access_token;
            return accessToken;
        } else {
            console.log("expired token")
            const refresh_token = token.refresh_token;
            let authToken = {};
            if (refresh_token) {
                const newToken = await oauth2.accessToken.create({ refresh_token: refresh_token }).refresh();
                authToken.access_token = newToken.token.access_token;
                authToken.expiry_date = new Date(newToken.token.expires_at);
                let obj = {
                    "access_token": newToken.token.access_token,
                    "expiry_date": new Date(newToken.token.expires_at)
                };
                let tokens = await auth_token.findOneAndUpdate({ "user_id": user_id }, { $set: obj }, { upsert: true }).catch(err => {
                    console.log(err);
                });
                accessToken = newToken.token.access_token;
                return accessToken;
            }
        }
    }
}



let checkEmail = async (emailObj, user_id, accessToken) => {
    let emailData = emailObj.body.content;
    $ = cheerio.load(emailData);
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
            anchortext.indexOf("not receiving our emails") != -1) {

            url = $(this).attr().href;
            console.log(url);

        } else if (anchorParentText.indexOf("not receiving our emails") != -1 ||
            anchorParentText.indexOf("stop receiving emails") != -1 ||
            anchorParentText.indexOf("unsubscribe") != -1 ||
            anchorParentText.indexOf("subscription") != -1 ||
            anchorParentText.indexOf("preferences") != -1 ||
            anchorParentText.indexOf("mailing list") != -1 ||
            (anchortext.indexOf("click here") != -1 && anchorParentText.indexOf("mailing list") != -1) ||
            ((anchortext.indexOf("here") != -1 || anchortext.indexOf("click here") != -1) && anchorParentText.indexOf("unsubscribe") != -1) ||
            anchorParentText.indexOf("Don't want this") != -1) {
            url = $(this).attr().href;
            console.log(url)
        }
    })
    if (url != null) {
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = null;
        emailInfo['unsubscribe'] = url;
        emailInfo['status'] = "unused";
        emailInfo['status_date'] = new Date()

        if (emailObj.isRead) {
            emailInfo['labelIds'] = 'INBOX';
            emailInfo['main_label'] = ['INBOX'];
        } else {
            emailInfo['labelIds'] = 'INBOX,UNREAD';
            emailInfo['main_label'] = ['INBOX', 'UNREAD'];
        }
        emailInfo['from_email'] = emailObj.from.emailAddress.address;
        emailInfo['to_email'] = emailObj.toRecipients[0].emailAddress.address;
        emailInfo['from_email_name'] = emailObj.from.emailAddress.name;
        emailInfo['subject'] = emailObj.subject;
        let emailInfoNew = {};
        emailInfoNew['email_id'] = emailObj.id;
        emailInfoNew['historyId'] = emailInfo['historyId'];
        emailInfoNew['unsubscribe'] = emailInfo['unsubscribe'];
        emailInfoNew['subject'] = emailInfo['subject'];
        emailInfoNew['labelIds'] = emailInfo['labelIds'];
        emailInfoNew['main_label'] = emailInfo['main_label'];
        if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
            console.log(emailInfo.from_email)
        } else {
            try {

                let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                    console.error(err.message, err.stack);
                });
                if (!fromEmail) {
                    await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
                        console.error(err.message, err.stack);
                    });
                    fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                        console.error(err.message, err.stack);
                    });
                }

                if (fromEmail) {
                    let doc = await emailInformation.findOne({ "email_id": emailInfoNew.email_id, "from_email_id": fromEmail._id }).catch(err => {
                        console.error(err.message, err.stack);
                    });
                    if (!doc) {
                        emailInfoNew['from_email_id'] = fromEmail._id;
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "status": "move", "user_id": user_id }).catch(err => {
                            console.error(err.message, err.stack);
                        });

                        await ExpenseBit.UpdateEmailInformation(emailInfoNew);
                        if (mailList) {
                            let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                            let id = await getFolderListForScrapping(accessToken, doc.user_id, link, emailInfoNew.email_id)
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "status": "trash", "user_id": user_id }).catch(err => { console.error(err.message); });
                        if (mailInfo) {
                            let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                            await getFolderListForTrashScrapping(accessToken, doc.user_id, link, emailInfoNew.email_id);
                        }
                    }
                }

            } catch (err) {
                console.log(err);
            }
        }
    }
}


router.get('/auth/callback', async function (req, res) {
    console.log("came here")
    let auth_code = req.query.code;
    let state = req.query.state;
    let result = await oauth2.authorizationCode.getToken({
        code: auth_code,
        redirect_uri: process.env.REDIRECT_URI,
        scope: process.env.APP_SCOPES
    }).catch(err => {
        console.log(err);
    });

    const token = await oauth2.accessToken.create(result);;
    const userInfo = jwt.decode(token.token.id_token);
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    users.findOne({ email: userInfo.preferred_username, email_client: "outlook" }, async function (err, existingUser) {
        if (existingUser) {
            await users.remove({ state: state }).catch(err => {
                console.log(err);
            });
            var userdata = {
                name: userInfo.name,
                state: state,
                email_client: "outlook"
            };
            await users.findOneAndUpdate({ "email": userInfo.preferred_username, email_client: "outlook" }, userdata, { upsert: true }).catch(err => {
                console.log(err);
            });
            await extract_token(existingUser, token.token.access_token, token.token.refresh_token, token.token.id_token, token.token.expires_at, token.token.scope, token.token.token_type).catch(err => {
                console.log(err);
            });

            var tokmodel = new token_model({
                "user_id": existingUser._id,
                "token": token_uniqueid,
                "created_at": new Date()
            });
            let tokenid = await tokmodel.save().catch(err => {
                console.log(err);
            });
            console.log(tokenid)
            if (tokenid) {
                var jsondata = { "tokenid": token_uniqueid, "user": existingUser };
                res.send();
            }
        } else {
            users.findOne({ state: state }, async function (err, newUserData) {
                if (newUserData) {
                    var userdata = {
                        email: userInfo.preferred_username ? userInfo.preferred_username : '',
                        name: userInfo.name,
                        email_client: "outlook"
                    };
                    let newUser = await users.findOneAndUpdate({ "state": state }, userdata, { upsert: true }).catch(err => {
                        console.log(err);
                    });
                    await extract_token(newUserData, token.token.access_token, token.token.refresh_token, token.token.id_token, token.token.expires_at, token.token.scope, token.token.token_type).catch(err => {
                        console.log(err);
                    });
                    var tokmodel = new token_model({
                        "user_id": newUserData._id,
                        "token": token_uniqueid,
                        "created_at": new Date()
                    });
                    let tokenid = await tokmodel.save().catch(err => {
                        console.log(err);
                    });
                    if (tokenid) {
                        var jsondata = { "tokenid": token_uniqueid, "user": newUser };
                        console.log(jsondata)
                        res.send();
                    }
                }

            });
        }

    });

});


async function extract_token(user, access_token, refresh_token, id_token, expiry_date, scope, token_type) {
    var tokedata = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "id_token": id_token,
        "scope": scope,
        "token_type": token_type,
        "expiry_date": new Date(expiry_date),
        "user_id": user._id,
        "created_at": new Date()
    };
    await auth_token.findOneAndUpdate({ "user_id": user._id }, tokedata, { upsert: true }).catch(err => {
        console.log(err);
    });
}

router.get('/getAuthTokenForApi', async function (req, res) {
    let state_code = req.query.state_code;
    users.findOne({ state: state_code }, async function (err, user) {
        if (user) {
            let tokenData = await token_model.findOne({ "user_id": user._id }).catch(err => {
                console.log(err);
            });
            var userdata = {
                state: null
            };
            await users.findOneAndUpdate({ "state": state_code }, userdata, { upsert: true }).catch(err => {
                console.log(err);
            });
            res.status(200).json({
                error: false,
                data: tokenData,
                user: user
            })
        } else {
            res.status(404).json({
                error: true,
                data: "no user found"
            })
        }

    });
});

module.exports = router



