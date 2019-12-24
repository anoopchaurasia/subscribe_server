'use strict'
const express = require('express');
const router = express.Router();
const EmailDataModel = require('../models/emailsData');
const token_model = require('../models/tokeno');
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;
fm.Include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;



/* This api will Scrape all the emails from Account and will store into Database. */
router.post('/getAllEmail', async (req, res) => {
    try {
        const doc = req.token;
        let emails = await Controller.extractAllEmail(doc, 'INBOX').catch(async err => {
            await BaseController.scanFinishedQuickClean();
        });;
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});


/* This api will delete Email from inbox */
router.post('/deleteQuickMailnew', async (req, res) => {
    try {
        const doc = req.token;
        let ids = req.body.email_ids;
        console.log(ids)
        await Controller.deleteQuickMail(doc, ids);
        res.status(200).json({
            error: false,
            data: ids
        });
    } catch (err) {
        console.log(err);
    }
});

/* This api will delete Email from inbox by from Email*/
router.post('/deleteQuickMail', async (req, res) => {
    try {
        const doc = req.token;
        let ids = req.body.email_ids;
        let emails = await EmailDataModel.aggregate([{ $match: { "user_id": doc.user_id, email_id: { $in: ids } } }, {
            $group: {
                _id: "$box_name",
                data: {
                    $push: {
                        "email_id": "$email_id"
                    }
                }, count: { $sum: 1 }
            }
        },
        { $sort: { "count": -1 } },
        { $project: { "email_id": 1, data: 1 } }]);
        await emails.asyncForEach(async data => {
            let ids = data.data.map(x => x.email_id);
            await Controller.deleteQuickMailNew(doc, ids, data._id);
        });
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});



router.post('/getEmailsBySizeFromDb', async (req, res) => {
    try {
        let start_date = req.body.start_date;
        let end_date = req.body.end_date;
        const doc = req.token;
        let emails;
        if (start_date == null || end_date == null) {
            emails = await EmailDataModel.aggregate([{ $match: { "user_id": doc.user_id, is_delete: false } }, {
                $group: {
                    _id: { "size_group": "$size_group" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "status": "$status",
                            "size": "$size",
                            "email_id": "$email_id",
                            "from_email": "$from_email"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "from_email": 1, "count": 1, "subject": 1, "size": 1, "email_id": 1, data: 1 } }]);
        } else {
            emails = await EmailDataModel.aggregate([{
                $match: {
                    $and: [{ "user_id": doc.user_id }, { is_delete: false },
                    { receivedDate: { $gte: new Date(start_date) } }, { receivedDate: { $lte: new Date(end_date) } }]
                }
            }, {
                $group: {
                    _id: { "size_group": "$size_group" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "status": "$status",
                            "size": "$size",
                            "email_id": "$email_id"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, "size": 1, "email_id": 1, data: 1 } }]);
        }
        console.log(emails.length);
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});


/* This api will return the emails based on the sender_email and also return total number of email by sender*/
router.post('/getEmailsBySenderFromDb', async (req, res) => {
    try {
        let start_date = req.body.start_date;
        let end_date = req.body.end_date;
        const doc = req.token;
        let emails;
        if (start_date == null || end_date == null) {
            emails = await EmailDataModel.aggregate([{ $match: { "user_id": doc.user_id, is_delete: false } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "status": "$status",
                            "size": "$size",
                            "email_id": "$email_id"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, "size": 1, "email_id": 1, data: 1 } }]);
        } else {
            emails = await EmailDataModel.aggregate([{
                $match: {
                    $and: [{ "user_id": doc.user_id }, { is_delete: false },
                    { receivedDate: { $gte: new Date(start_date) } }, { receivedDate: { $lte: new Date(end_date) } }]
                }
            }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "status": "$status",
                            "size": "$size",
                            "email_id": "$email_id"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, "size": 1, "email_id": 1, data: 1 } }]);
        }
        console.log(emails.length);
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});


/* This api will return the emails based on the Date from database */
router.post('/getEmailsByDateFromDb', async (req, res) => {
    try {
        let { data } = req.body;
        const doc = req.token;
        let emails;
        if (data.isCustom) {
            emails = await EmailDataModel.find({ user_id: doc.user_id, receivedDate: { $gte: data.since, $lte: data.before }, is_delete: false });
        } else {
            if (data.beforeOrAfter === 'BEFORE') {
                emails = await EmailDataModel.find({ user_id: doc.user_id, receivedDate: { $lte: data.date }, is_delete: false });
            } else {
                emails = await EmailDataModel.find({ user_id: doc.user_id, receivedDate: { $gte: data.date }, is_delete: false });
            }
        }
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});


/* This api will return the emails based on the Date from database */
router.post('/getTotalUnreadMail', async (req, res) => {
    try {
        const doc = req.token;
        let emails = await EmailDataModel.countDocuments({ user_id: doc.user_id, status: "unread", is_delete: false });
        let finished = false;
        let is_finished = await BaseController.isScanFinishedQuickClean(doc.user_id);
        if (is_finished && is_finished == "true") {
            console.log("is_finished_quick_clean here-> ", is_finished);
            finished = true;
        }
        if (is_finished === null) {
            await BaseController.scanFinishedQuickClean(doc.user_id);
        }
        res.status(200).json({
            error: false,
            data: emails,
            finished: finished,
        });
    } catch (err) {
        console.log(err);
    }
});



/* This api will return the emails based on the sender_email and also return total number of email by sender*/
router.post('/getEmailsByLabelFromDb', async (req, res) => {
    try {
        let start_date = req.body.start_date;
        let end_date = req.body.end_date;
        const doc = req.token;
        let emails;
        if (start_date == null || end_date == null) {
            emails = await EmailDataModel.aggregate([{ $match: { "user_id": doc.user_id, is_delete: false } }, {
                $group: {
                    _id: { "box_name": "$box_name" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "status": "$status",
                            "size": "$size",
                            "email_id": "$email_id",
                            "from_email": "$from_email"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "from_email": 1, "count": 1, "subject": 1, "size": 1, "email_id": 1, data: 1 } }]);
        } else {
            emails = await EmailDataModel.aggregate([{
                $match: {
                    $and: [{ "user_id": doc.user_id }, { is_delete: false },
                    { receivedDate: { $gte: new Date(start_date) } }, { receivedDate: { $lte: new Date(end_date) } }]
                }
            }, {
                $group: {
                    _id: { "box_name": "$box_name" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "status": "$status",
                            "size": "$size",
                            "email_id": "$email_id"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, "size": 1, "email_id": 1, data: 1 } }]);
        }
        console.log(emails.length);
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});

module.exports = router