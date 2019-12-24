'use strict'
const express = require('express');
const router = express.Router();
fm.Include("com.anoop.imap.RedisPush");
let ImapRedisPush = com.anoop.imap.RedisPush;
fm.Include("com.anoop.email.Email");
let EmailValidate = com.anoop.email.Email;
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;
router.post('/imapManualUnsubEmailFromUser', async (req, res) => {
    try {
        const user = req.user;
        let sender_email = req.body.sender_email;
        let array = sender_email.split(",") || sender_email.split(";");
        array.forEach(async element => {
            console.log(element)
            element = element.trim();
            let validate = await EmailValidate.validate(element);
            console.log("is valid", validate)
            if (validate) {
                await Controller.manualUnusedToUnsub(user, element);
            }
        });
        res.status(200).json({
            error: false,
            data: "scrape"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});

router.post('/imapManualTrashEmailFromUser', async (req, res) => {
    try {
        const user = req.user;
        let sender_email = req.body.sender_email;
        let array = sender_email.split(",") || sender_email.split(";");
        array.forEach(async element => {
            console.log(element)
            element = element.trim();
            let validate = await EmailValidate.validate(element);
            console.log("is valid", validate)
            if (validate) {
                await Controller.manualUnusedToTrash(user, element);
            }
        });
        res.status(200).json({
            error: false,
            data: "scrape"
        })

    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});


router.post('/trashZohoMail', async (req, res) => {
    try {
        const user = req.user;
        ImapRedisPush.unusedToTrash(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "move"
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
        const user = req.user;
        ImapRedisPush.unusedToKeep(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "keep"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack);
        res.sendStatus(400);
    }
});

router.post('/unsubscribeZohoMail', async (req, res) => {
    try {
        const user = req.user;
        ImapRedisPush.unusedToUnsub(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "move"
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
        const user = req.user;
        ImapRedisPush.unsubToKeep(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "unsubtokeep"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/leftUnsubToTrashZohoMail', async (req, res) => {
    try {
        const user = req.user;
        ImapRedisPush.unsubToTrash(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "unsubtotrash"
        })

    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/leftInboxToTrashZohoMail', async (req, res) => {
    try {
        const user = req.user;
        ImapRedisPush.keepToTrash(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "trashtoinbox"
        })
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
        const user = req.user;
        ImapRedisPush.trashToKeep(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "trashtoinbox"
        })
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
        const user = req.user;
        ImapRedisPush.keepToUnsub(user, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "trashtoinbox"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

module.exports = router