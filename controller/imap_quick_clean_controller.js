'use strict'
const express = require('express');
const router = express.Router();
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;

fm.Include("com.anoop.imap.RedisPush");
let ImapRedisPush = com.anoop.imap.RedisPush;


/* This api will Scrape all the emails from Account and will store into Database. */
router.post('/getAllEmail', async (req, res) => {
    try {
        let is_finished = await Controller.isScanFinishedQuickClean(req.user._id);
        if (is_finished == "false") {
            return res.status(202).json({
                error: false,
                data: "already scaning"
            });
        }
        await Controller.scanStartedQuickClean(req.user._id);
        ImapRedisPush.extractAllEmail(req.user);
        res.status(200).json({
            error: false,
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
        }).catch(err=> {
            console.error(err, "getEmailsBySizeFromDb")
            res.status(500).json({
                error: true,
            });
        });
        if(!emails) return;
        console.log("took", emails.took);
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
        let { start_date, end_date, page ,after_key} = req.query;
        let limit = 10;
        let offset = (page || 0) * limit;
        let next = after_key;
        let emails = await Controller.EmailDataModel.getBySender({
            start_date, end_date, user, offset, limit,next
        }).catch(err=> {
            console.error(err, "by_sender")
            res.status(500).json({
                error: true,
            });
        });
        if(!emails) return;
        console.log("took", emails.took);
        let newEmails = emails.aggregations.my_buckets.buckets;
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
        res.status(200).json({
            error: false,
            data: emailData
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
        let emails = await Controller.EmailDataModel.countDocument({user}).catch(err=> {
            console.error(err, "getTotalUnreadMail")
            res.status(500).json({
                error: true,
            });
        });
        if(!emails) return;
        console.log("took", emails.took);
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
        }).catch(err=> {
            console.error(err, "getEmailsByLabelFromDb")
            res.status(500).json({
                error: true,
            });
        });
        if(!emails) return;
        console.log("took", emails.took);
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