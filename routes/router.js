var express = require('express');
var router = express.Router();


router.use('/auth', require('../controller/auth_controller'));
router.use('/email', require('../controller/email_controller'));

module.exports = router;