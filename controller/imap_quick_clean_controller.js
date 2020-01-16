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
        // emails.forEach(element => {
        //     let total = element.data.filter(x => x.status == "read").length;
        //     element.readcount = total;
        //     delete element.data;
        // });
        let emailData = [];
        emails = emails.aggregations.top_tags.buckets;
        emails.forEach(element => {
            let obj = {
                "_id":{
                    "size_group":element.key
                },
                "size":element.size.value,
                "count":element.doc_count,
                "readcount":element.readcount.doc_count,
                "subject":element.size_group.hits.hits.map(x=>x._source.subject)
            }
            emailData.push(obj);
        });
        res.status(200).json({
            error: false,
            data: emailData
        });
    } catch (err) {
        console.log(err);
    }
});

router.get("/by_sender", async (req, res) => {
    try {
        const user = req.user;
        console.log(user)
        let { start_date, end_date, page ,after_key} = req.query;
        console.log(req.query)
        let limit = 20;
        let offset = (page || 0) * limit;
        let next = after_key;
        let emails = await Controller.EmailDataModel.getBySender({
            start_date, end_date, user, offset, limit,next
        });
        // emails = emails.aggregations.top_tags.buckets;
        let newEmails = emails.aggregations.my_buckets.buckets;
        let next_key ;
        if(emails.length!=0){
            next_key = emails.aggregations.my_buckets.after_key.from_email;
        }
        // console.log(emails),
        console.log(next_key);

        let emailData = [];
        newEmails.forEach(element => {
            let obj = {
                "_id":{
                    "from_email":element.key.from_email
                },
                "size":element.size.value,
                "count":element.doc_count,
                "readcount":element.readcount.doc_count,
                "subject":element.from_email.hits.hits.map(x=>x._source.subject)
            }
            emailData.push(obj);
        });
        console.log("response data",emailData)
        res.status(200).json({
            error: false,
            data: emailData,
            next_key : next_key
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
        ImapRedisPush.deleteBySender(user,start_date,end_date,from_emails);
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
        ImapRedisPush.deleteByLabel(user,start_date,end_date,label_name);
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
        ImapRedisPush.deleteBySize(user,start_date,end_date,size_group);
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
        // let emails = await EmailDataModel.countDocuments({
        //     user_id: user._id,
        //     deleted_at: null
        // });
        let emails = await Controller.EmailDataModel.countDocument({user});
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
        // emails.forEach(element => {
        //     let total = element.data.filter(x => x.status == "read").length;
        //     element.readcount = total;
        //     delete element.data;
        // });
        let emailData = [];
        emails = emails.aggregations.top_tags.buckets;
        emails.forEach(element => {
            let obj = {
                "_id":{
                    "box_name":element.key
                },
                "size":element.size.value,
                "count":element.doc_count,
                "readcount":element.readcount.doc_count,
                "subject":element.box_name.hits.hits.map(x=>x._source.subject)
            }
            emailData.push(obj);
        });
        res.status(200).json({
            error: false,
            data: emailData
        });
    } catch (err) {
        console.log(err);
    }
});

module.exports = router