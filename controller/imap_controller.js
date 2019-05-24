'use strict'
const express = require('express');
const router = express.Router();
const simpleParser = require('mailparser').simpleParser;
const Imap = require('imap');
const email = require('../models/emailDetailImap');
const emailInformation = require('../models/emailInfoImap');
const UserModel = require('../models/userImap');
const token_model = require('../models/tokeno');
const cheerio = require('cheerio');
const uniqid = require('uniqid');
var crypto = require('crypto');
var randomstring = require("randomstring");
var dns = require('dns');
var legit = require('legit');


router.post('/loginWithImap', async (req, res) => {
    try {
        let EMAIL = req.body.username;
        let PASSWORD = req.body.password;//'X8gUne7rqLZS';
        // Connect
        var algorithm = 'aes256';
        // secret key
        var key = 'donnottrytodecryptthisone';
        // user passord
        // generate new password with padding
        var new_password = randomstring.generate(8).toLowerCase() + PASSWORD.substring(0, 3) + randomstring.generate(4).toLowerCase() + PASSWORD.substring(3, PASSWORD.length) + randomstring.generate(6).toLowerCase();
        var cipher = crypto.createCipher(algorithm, key);
        var encrypted = cipher.update(new_password, 'utf8', 'hex') + cipher.final('hex');
        PASSWORD=encrypted;
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        if (imap) {
            const boxes = await getBoxes(imap);
            const names = [];
            Object.keys(boxes).sort().forEach(boxName => {
                names.push(boxName);
                const box = boxes[boxName];
                if (box.children) {
                    Object.keys(box.children).sort().forEach(childName => {
                        names.push(`${boxName}${box.delimiter}${childName}`);
                    });
                }
            });
            console.log(names)
            if (!names.includes("Unsubscribed Emails")) {
                await createInbox(imap);
            }
            let user = await UserModel.findOne({ "email": EMAIL });
            if (!user) {
                var newUser = new UserModel({
                    "email": EMAIL,
                    "password": PASSWORD
                });
                user = await newUser.save().catch(err => {
                    console.error(err.message, err.stack);
                });
            }
            let response = await create_token(user);
            if (response) {
                // await createInbox(imap);
                imap.end(imap);
                res.status(200).json({
                    error: false,
                    status:200,
                    data: response
                })
            } else {
                res.status(404).json({
                    error: true
                });
            }
        }
        // res.send({"status":200,"code":"xyz"})
    } catch (error) {
        console.log("here", error)
        res.status(401).json({
            error: true,
            data: null
        })
    }
});

// vljwqnoyisyztlft

let getProvider = async (email) => {
    var domain = email.split('@')[1];
    try {
                const response = await legit(email);
                console.log(response)
                if(response.isValid){
                    let mxr = response.mxArray[0].exchange;
                    if (mxr.includes("zoho")) {
                        return "zoho";
                    }
                    else if (mxr.includes("yahoo")) {
                        return "yahoo";
                    } 
                }
            } catch (e) {
                console.log(e);
            }
    // dns.resolve(domain, 'MX',async function (err, addresses) {
    //     if (addresses) {
    //         console.log(addresses)
    //         console.log(addresses[0].exchange);
    //         let mxr = addresses[0].exchange;
    //         if (mxr.includes("zoho")) {
    //           return "zoho";
    //         }
    //         else if (mxr.includes("yahoo")) {
    //           return "yahoo";
    //         } 
    //     }
    // });
}



router.post('/findEmailProvider', async (req, res) => {
    try {
        let email = req.body.emailId;
        var domain = email.split('@')[1];
        dns.resolve(domain, 'MX', function (err, addresses) {
           if(addresses){
               console.log(addresses)
               console.log(addresses[0].exchange);
               let mxr =  addresses[0].exchange;
               let provider=null;
               if (mxr.includes("zoho")){
                   provider = "https://accounts.zoho.com/u/h#home";
               }else if(mxr.includes("yahoo")){
                   provider = "https://login.yahoo.com/?done=https%3A%2F%2Flogin.yahoo.com%2Faccount%2Fsecurity%3F.scrumb%3D0";
               } 
               res.status(200).json({
                   error: false,
                   status:200,
                   data: provider
               })
           }
        })
        // res.send({"status":200,"code":"xyz"})
    } catch (error) {
        console.log("here", error)
        res.status(401).json({
            error: true,
            data: null
        })
    }
});

async function create_token(user) {
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    var tokmodel = new token_model({
        "user_id": user._id,
        "token": token_uniqueid,
        "created_at": new Date()
    });
    await tokmodel.save().catch(err => {
        console.error(err.message, err.stack);
    });
    return {
        "tokenid": token_uniqueid,
        "user": user
    };
}


router.post('/readZohoMail', async (req, res) => {
    let tokenInfo = await token_model.findOne({ "token": req.body.token });
    let user = await UserModel.findOne({ _id: tokenInfo.user_id });
    let EMAIL = user.email;
    let PASSWORD = user.password;
    console.log(user)
    const imap = await connect({ EMAIL, PASSWORD });
    console.log('Connected');

    // Open INBOX
    const box = await openBox(imap, 'INBOX');
    console.log('Box', box);

    let since = new Date(Date.now() - 864e5);
    const ids = await search(imap, [box.messages.total - 5 + ':' + box.messages.total]);
    console.log('Ids', ids);

    const spam = await fetchAndFilter(imap, ids, async (msg, i) => {
        console.log(msg.header)
        let emailInfo = {};
        let from_data = msg.header.from.indexOf("<") != -1 ? msg.header.from.split("<")[1].replace(">", "") : msg.header.from;
        emailInfo['from_email_name'] = msg.header.from;
        emailInfo['from_email'] = from_data;
        emailInfo['status'] = "unused";
        emailInfo['status_date'] = new Date();
        let emailInfoNew = {
            msg_uid: msg.uid,
            unsubscribe: msg.url
        };
        let userInfo = await UserModel.findOne({ "_id": tokenInfo.user_id });

        let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": userInfo._id }).catch(err => {
            console.error(err.message, err.stack);
        });
        if (!fromEmail) {
            await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": userInfo._id }, emailInfo, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            });
            fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": userInfo._id }).catch(err => {
                console.error(err.message, err.stack);
            });
        }

        if (fromEmail) {
            let doc = await emailInformation.findOne({ "email_id": emailInfoNew.msg_uid, "from_email_id": fromEmail._id }).catch(err => {
                console.error(err.message, err.stack);
            });
            if (!doc) {
                emailInfoNew['from_email_id'] = fromEmail._id;

                await emailInformation.findOneAndUpdate({ "msg_uid": emailInfoNew.msg_uid, 'from_email_id': fromEmail._id }, emailInfoNew, { upsert: true }).catch(err => {
                    console.error(err.message, err.stack);
                });
                let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "status": "move", "user_id": userInfo._id }).catch(err => {
                    console.error(err.message, err.stack);
                });
                if (mailList) {
                    let msgids = [];
                    msgids.push(emailInfoNew.msg_uid);
                     await unsubscribe(imap,msgids);
                }
                let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "status": "trash", "user_id": userInfo._id }).catch(err => { console.error(err.message); });
                if (mailInfo) {
                     let msgids = [];
                    msgids.push(emailInfoNew.msg_uid);
                    await trashzoho(imap,msgids);
                }
            }
        }
        return msg;
    });


    const spamIds = spam.map(msg => msg.uid);
    console.log(spamIds)
    imap.end(imap);
    res.status(200).json({
        error: false,
        status: 200,
        data: "success"
    })

});

router.post('/getMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllsubscription(doc.user_id).catch(err => {
                console.error(err.message, err.stack);
            });
            // const unreademail = await getUnreadEmailData(doc.user_id);
            const total = await getTotalEmailCount(doc.user_id).catch(err => {
                console.error(err.message, err.stack);
            });
            console.log(emailinfos,total)
            res.status(200).json({
                error: false,
                data: emailinfos,
                // unreadData: unreademail,
                totalEmail: total
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});

router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllKeepedSubscription(doc.user_id);
            // let unreadData = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
            if (emailinfos) {
                const total = await getTotalEmailCount(doc.user_id);
                console.log("keep",emailinfos, total)
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    // unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllUnsubscribeSubscription(doc.user_id);
            if (emailinfos) {
                const total = await getTotalEmailCount(doc.user_id);
                console.log("unsub", emailinfos, total)
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    // unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getTrashMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllTrashSubscription(doc.user_id);
            if (emailinfos) {

                const total = await getTotalEmailCount(doc.user_id);
                console.log("trash", emailinfos, total)
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    // unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getEmailSubscription', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllsubscription(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        console.error(err.message, err.stack);
    }
});

router.post('/saveProfileInfo', async (req, res) => {
    try {
        console.log(req.body)
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            let userObj = {
                name:req.body.first_name,
                "last_name":req.body.last_name,
                "dob":req.body.dob,
                "mobile_no":req.body.mobile_no
            };
            await UserModel.findOneAndUpdate({"_id":doc.user_id},userObj,{upsert:true}).catch(err=>{
                console.error(err.message,err.stack);
            })
            let user = await UserModel.findOne({"_id":doc.user_id});
        
            res.status(200).json({
                error: false,
                status:200,
                data: user
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});


async function getTotalEmailCount(user_id) {
    let totalNL = await email.find({ "user_id": user_id }).catch(err => {
        console.error(err.message, err.stack);
    });
    let total = 0;
    let count = 0;
    for (let i = 0; i < totalNL.length; i++) {
        count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
            console.error(err.message, err.stack);
        });
        total = total + count;
    }
    return total;
}


async function getAllsubscription(user_id) {
    const emails = await email.find({ "status": "unused", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}

async function getAllKeepedSubscription(user_id) {
    const emails = await email.find({ "status": "keep", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}

async function getAllUnsubscribeSubscription(user_id) {
    const emails = await email.find({ "status": "move", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}


async function getAllTrashSubscription(user_id) {
    const emails = await email.find({ "status": "trash", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}





router.post('/loginImap', async (req, res) => {
    const EMAIL = 'prantik@expensebit.com';
    const PASSWORD = 'X8gUne7rqLZS';
    const imap = await connect({ EMAIL, PASSWORD });
    console.log('Connected');

    const box = await openBox(imap, 'INBOX');
    console.log('Box', box);

    let since = new Date(Date.now() - 864e5); // One day ago
    console.log(box.messages.new)
    const ids = await search(imap, [box.messages.total - box.messages.new + ':' + box.messages.total]);
    console.log('Ids', ids);

    const spam = await fetchAndFilter(imap, ids, async (msg, i) => {
        console.log(msg.header)
        return msg;
    });



    const spamIds = spam.map(msg => msg.uid);
    console.log(spamIds)
    // imap.end(imap);

});

async function connect(loginCred, err, cb) {
    console.log(loginCred)
    let { EMAIL, PASSWORD } = loginCred;
    var algorithm = 'aes256';
    // secret key
    var key = 'donnottrytodecryptthisone';
    var decipher = crypto.createDecipher(algorithm, key);
    var decrypted = decipher.update(PASSWORD, 'hex', 'utf8') + decipher.final('utf8');
    //decrypt password with reverse method
    var remove_padding = decrypted.slice(8, decrypted.length - 6)
    var your_password = remove_padding.substring(0, 3) + remove_padding.substring(7, remove_padding.length);

    let host_check = await getProvider(EMAIL);
    console.log(host_check)
    
    return new Promise((resolve, reject) => {
        let imaphost = null;
        if(host_check=="zoho"){
            imaphost = "imappro.zoho.com";
        }else if(host_check=="yahoo"){
            imaphost = "imap.mail.yahoo.com";
        }
        const imap = new Imap({
            user: EMAIL,
            password: your_password,
            host: imaphost,
            port: 993,
            tls: true
        });

        imap.once('ready', async () => {
            resolve(imap)
        });
        imap.once('error', err => reject(err));
        imap.connect();
    })
}


router.post('/trashZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        const box = await openBox(imap, 'INBOX');

        let mail = await email.findOne({ "from_email": req.body.fromEmail, "status": "unused" }).catch(err => {
            console.error(err.message, err.stack);
        });
        console.log(mail)
        if (mail) {
            let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "msg_uid": 1 }).catch(err => { console.error(err.message, err.stack); });
            console.log(mailList)
            let msgUidList = mailList.map(x => x.msg_uid);
            if (msgUidList) {
                console.log(msgUidList)
                await trashzoho(imap, msgUidList);
                await email.findOneAndUpdate({ 'from_email': req.body.fromEmail, user_id: tokenInfo.user_id }, { "status": "trash", "status_date": new Date() }, { upsert: true });
            }
            imap.end(imap);
            return res.status(200).json({
                error: false,
                data: "move"
            })
        }
        return res.status(401).json({
            error: true,
            data: "msg not found"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});


router.post('/keepZohoMail', async (req, res) => {
    try {
        const from_email = req.body.fromEmail;
        let doc = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        if (doc) {
            var oldvalue = {
                "from_email": from_email,
                "user_id": doc.user_id
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
            return res.status(200).json({
                error: false,
                data: "keep"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
        res.sendStatus(400);
    }
});


router.post('/unsubscribeZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        const box = await openBox(imap, 'INBOX');
       
        let mail = await email.findOne({ "from_email": req.body.fromEmail, "status": "unused" }).catch(err => {
            console.error(err.message, err.stack);
        });
        console.log(mail)
        if (mail) {
            let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "msg_uid": 1 }).catch(err => { console.error(err.message, err.stack); });
            console.log(mailList)
            let msgUidList = mailList.map(x => x.msg_uid);
            if (msgUidList) {
                console.log(msgUidList)
                await unsubscribe(imap, msgUidList);
                await email.findOneAndUpdate({ 'from_email': req.body.fromEmail, user_id: tokenInfo.user_id}, { "status": "move", "status_date": new Date() }, { upsert: true });
            }
            imap.end(imap);
            return res.status(200).json({
                error: false,
                data: "move"
            })
        }
        res.status(401).json({
            error: true,
            data: "msg not found"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/revertUnsubscribeZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        const box = await openBox(imap,'Unsubscribed Emails')
        const boxes = await getBoxes(imap);
        const names = [];
        Object.keys(boxes).sort().forEach(boxName => {
            names.push(boxName);
            const box = boxes[boxName];
            if (box.children) {
                Object.keys(box.children).sort().forEach(childName => {
                    names.push(`${boxName}${box.delimiter}${childName}`);
                });
            }
        });
        console.log(names)
        const msgUidList = await search(imap, [["FROM", req.body.fromEmail]]);
        console.log(msgUidList)
        if (msgUidList) {
            console.log(msgUidList)
            await revertMail(imap, msgUidList);
            await email.findOneAndUpdate({ 'from_email': req.body.fromEmail, user_id: tokenInfo.user_id}, { "status": "keep", "status_date": new Date() }, { upsert: true });
            imap.end(imap);
            return res.status(200).json({
                error: false,
                data: "move"
            })
        }else{
            return res.status(401).json({
                    error: true,
                    data: "msg not found"
                })
        }
  
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/revertTrashZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        const box = await openBox(imap,'Trash')
        const msgUidList = await search(imap, [["FROM",req.body.fromEmail]]);  
        console.log(msgUidList)
        if (msgUidList) {
            console.log(msgUidList)
            await revertMail(imap, msgUidList);
            await email.findOneAndUpdate({ 'from_email': req.body.fromEmail, user_id: tokenInfo.user_id }, { "status": "keep", "status_date": new Date() }, { upsert: true });
            return res.status(200).json({
                error: false,
                data: "move"
            })
        } else {
            return res.status(401).json({
                error: true,
                data: "msg not found"
            })
        }
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});


router.post('/revertInboxToUnsubscribeImapZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        const box = await openBox(imap, 'Inbox')
        const msgUidList = await search(imap, [["FROM", req.body.fromEmail]]);
        console.log(msgUidList)
        if (msgUidList) {
            console.log(msgUidList)
            await unsubscribe(imap, msgUidList);
            await email.findOneAndUpdate({ 'from_email': req.body.fromEmail, user_id: tokenInfo.user_id }, { "status": "move", "status_date": new Date() }, { upsert: true });
            return res.status(200).json({
                error: false,
                data: "move"
            })
        } else {
            return res.status(401).json({
                error: true,
                data: "msg not found"
            })
        }
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

function getBoxes(imap) {
    return new Promise((resolve, reject) => {
        imap.getBoxes(function (err, boxes) {
            (err ? reject(err) : resolve(boxes));
        });
    });
}

function createInbox(imap) {
    return new Promise((resolve, reject) => {
        imap.addBox("Unsubscribed Emails", function (err, box) {
            (err ? reject(err) : resolve(box));
        })
    });
}

function openBox(imap, boxName) {
    return new Promise((resolve, reject) => {
        imap.openBox(boxName, false, function (err, box) {
            (err ? reject(err) : resolve(box));
        });
    });
}

function search(imap, criteria) {
    return new Promise((resolve, reject) => {
        imap.search(criteria, function (err, uids) {
            (err ? reject(err) : resolve(uids));
        });
    });
}

async function getUrlFromEmail(body) {
    if (!body) {
        return null;
    }
    let $ = cheerio.load(body);
    let url = null;
    $('a').each(async function (i, elem) {
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
            return url;
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
            return url;
        }
    })
    return url;
}

async function parseMessage(msg) {
    const [atts, parsed] = await Promise.all([
        new Promise(resolve => {
            msg.on('attributes', atts => {
                resolve(atts)
            });
            msg.on('error', atts => reject(err));
        }),

        new Promise((resolve, reject) => {
            let result;
            msg.on('body', (stream, info) => {
                const chunks = [];
                stream.once('error', reject);
                stream.on('data', chunk => chunks.push(chunk));
                stream.once('end', async () => {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    let parsed = await simpleParser(raw);
                    if (!result) {
                        result = Imap.parseHeader(raw);
                        for (let k in result) {
                            if (Array.isArray(result[k])) result[k] = result[k][0];
                        }
                    }
                    console.log(parsed)
                    if (result != {} && parsed['textAsHtml'] != undefined) {
                        let url = await getUrlFromEmail(parsed['textAsHtml']);
                        if (url != null) {
                            console.log(url)
                            resolve({ "header": result, "url": url })
                        }
                    }
                });
            });
        })
    ]);
    parsed.uid = atts.uid;
    return parsed;
}

function fetchAndFilter(imap, msgIds, detector) {
    return new Promise((resolve, reject) => {
        const fetch = imap.fetch(msgIds, {
            bodies: ['HEADER.FIELDS (FROM)', 'TEXT']
        });
        const pending = [];
        const msgs = [];
        fetch.on('message', async function (msg, seqNo) {
            pending.push(new Promise(async resolve => {
                // console.log(msg)
                let data = {}
                let result
                const parsed = await parseMessage(msg, 'utf8');
                console.log(parsed)

                if (detector(parsed)) msgs.push(parsed);
                resolve();
            }));
        });

        fetch.on('end', async function () {
            await Promise.all(pending);
            resolve(msgs);
        });
    });
}


async function trashzoho(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;
    console.log("trash", msgIds);
    await new Promise((resolve, reject) => {
        imap.move(msgIds, 'Trash', function (err) {
            (err ? reject(err) : resolve());
        });
    });
    

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}


async function unsubscribe(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;
    console.log("came here", msgIds)
    await new Promise((resolve, reject) => {
        imap.move(msgIds, 'Unsubscribed Emails', function (err) {
            (err ? reject(err) : resolve());
        });
    });

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}

async function revertMail(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;
    console.log("came here for revert", msgIds)
    await new Promise((resolve, reject) => {
        imap.move(msgIds, 'INBOX', function (err) {
            (err ? reject(err) : resolve());
        });
    });
    

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}


module.exports = router


