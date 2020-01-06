'use strict'
const express = require('express');
const router = express.Router();
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;
const EmailDataModel = require('../models/emailsData');

fm.Include("com.anoop.imap.RedisPush");
let ImapRedisPush = com.anoop.imap.RedisPush;


/* This api will Scrape all the emails from Account and will store into Database. */
router.post('/getAllEmail', async (req, res) => {
    try {
        ImapRedisPush.extractAllEmail(req.user);
        res.status(200).json({
            error: false,
        });
    } catch (err) {
        console.log(err);
    }
});


/* This api will delete Email from inbox */
router.post('/deleteQuickMailnew', async (req, res) => {
    try {
        const user = req.user;
        let ids = req.body.email_ids;
        await Controller.deleteQuickMail(user, ids);
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
        const user = req.user;
        let ids = req.body.email_ids;
        let emails = await EmailDataModel.aggregate([{
            $match: {
                "user_id": user._id,
                email_id: {
                    $in: ids
                }
            }
        }, {
            $group: {
                _id: "$box_name",
                data: {
                    $push: {
                        "email_id": "$email_id"
                    }
                },
                count: {
                    $sum: 1
                }
            }
        },
        {
            $sort: {
                "count": -1
            }
        },
        {
            $project: {
                "email_id": 1,
                data: 1
            }
        }
        ]);
        await emails.asyncForEach(async data => {
            let ids = data.data.map(x => x.email_id);
            console.log("deleting ", ids.length, "from ", data._id);
            await Controller.deleteQuickMailNew(user, ids, data._id);
        });
        res.status(200).json({
            error: false,
            data: "done"
        });
    } catch (err) {
        console.log(err);
    }
});



router.post('/getEmailsBySizeFromDb', async (req, res) => {
    try {
        let start_date = req.body.start_date;
        let end_date = req.body.end_date;
        const user = req.user;
        let emails = await Controller.EmailDataModel.getBySize({
            start_date, end_date, user
        });
        emails.forEach(element => {
            let total = element.data.filter(x => x.status == "read").length;
            element.readcount = total;
            delete element.data;
        });
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});

router.get("/by_sender", async (req, res) => {
    try {
        const user = req.user;
        let { start_date, end_date, page } = req.query;
        let limit = 20;
        let offset = (page || 0) * limit;
        let emails = await Controller.EmailDataModel.getBySender({
            start_date, end_date, user, offset, limit
        });
        emails.forEach(element => {
            let total = element.data.filter(x => x.status == "read").length;
            element.readcount = total;
            delete element.data;
        });
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        res.status(502).json({ error: err.message })
        console.error(err);
    }
});

router.post("/delete_by_sender", async (req, res) => {
    let { start_date, end_date, from_emails } = req.body;
    const user = req.user;
    try {
        let emails = await Controller.EmailDataModel.getIdsByFromEmail({
            start_date, end_date, user, from_emails
        })
        // console.log(emails)
        await emails.asyncForEach(async data => {
            let ids = data.data.map(x => x.email_id);
            await Controller.deleteQuickMailNew(user, ids, data._id);
        });
        res.status(200).json({
            error: false,
            data: "done"
        });
    } catch (err) {
        console.log(err);
    }
});

router.post("/delete_by_label", async (req, res) => {
    let { start_date, end_date, label_name } = req.body;
    const user = req.user;
    console.log(start_date, end_date, label_name)
    try {
        let emails = await Controller.EmailDataModel.getIdsByLabelName({
            start_date, end_date, user, label_name
        })
        console.log(emails)
        await emails.asyncForEach(async data => {
            let ids = data.data.map(x => x.email_id);
            console.log("deleting ", ids.length, "from ", data._id);
            await Controller.deleteQuickMailNew(user, ids, data._id);
        });
        res.status(200).json({
            error: false,
            data: "done"
        });
    } catch (err) {
        console.log(err);
    }
});

router.post("/delete_by_size", async (req, res) => {
    let { start_date, end_date, size_group } = req.body;
    const user = req.user;
    try {
        let emails = await Controller.EmailDataModel.getIdsBySize({
            start_date, end_date, user, size_group
        })
        console.log(emails)
        await emails.asyncForEach(async data => {
            let ids = data.data.map(x => x.email_id);
            console.log("deleting ", ids.length, "from ", data._id);
            await Controller.deleteQuickMailNew(user, ids, data._id);
        });
        res.status(200).json({
            error: false,
            data: "done"
        });
    } catch (err) {
        console.log(err);
    }
});




/* This api will return the emails based on the Date from database */
router.post('/getTotalUnreadMail', async (req, res) => {
    try {
        const user = req.user;
        let emails = await EmailDataModel.countDocuments({
            user_id: user._id,
            deleted_at: null
        });
        let finished = false;
        let is_finished = await Controller.isScanFinishedQuickClean(user._id);
        if (is_finished && is_finished == "true") {
            console.log("is_finished_quick_clean here-> ", is_finished);
            finished = true;
        }
        if (is_finished === null) {
            await Controller.scanFinishedQuickClean(user._id);
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
        const user = req.user;
        let emails = await Controller.EmailDataModel.getByLabel({
            start_date, end_date, user
        });
        emails.forEach(element => {
            let total = element.data.filter(x => x.status == "read").length;
            element.readcount = total;
            delete element.data;
        });
        res.status(200).json({
            error: false,
            data: emails
        });
    } catch (err) {
        console.log(err);
    }
});

module.exports = router