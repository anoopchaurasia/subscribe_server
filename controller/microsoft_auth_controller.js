
let express = require('express');
let router = express.Router();

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
fm.Include("com.anoop.outlook.Controller");
let Controller = com.anoop.outlook.Controller;


router.post('/getMail', async function (req, resp, next) {
    let user = req.user;
    await Controller.extractEmail(user._id).catch(e => console.error(e));
    resp.status(200).json({
        error: false,
        message: "scrapping"
    })
})

router.post('/setPrimaryEmail', async (req, res) => {
    try {
        let user = req.user;
        let email = req.body.email;
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        if (email != null) {
            await Controller.setPrimaryEmail(user._id, email, ipaddress);
            res.status(200).json({
                error: false,
                status: 200
            })
        } else {
            res.status(400).json({
                error: true,
                status: 400
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});

router.post('/moveEmailFromInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let user = req.user;
        await Controller.moveEmailFromInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertMailToInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let user = req.user;
        await Controller.revertUnsubToInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "revert"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
       let user = req.user;

        await Controller.revertTrashToInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "revert"
        })
     
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/moveEmailToTrashFromInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let user = req.user;
        await Controller.moveEmailToTrashFromInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "trash"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

module.exports = router