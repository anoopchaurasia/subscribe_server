'use strict'
const express = require('express');
const AppVersionModel = require('../models/appVersion');
const router = express.Router();

/*
This is the Login api. 
Using This api use can logged-in into system.
====
This api will get code/authentication code from application and using that application
code extracting token and user data. and saving and updating into database.
*/
router.post('/signin', async (req, res) => {
        
});


router.get('/getAppVersion', async (req, res) => {
    try {
        let versionData = await AppVersionModel.findOne().sort({ version_name: -1 }).limit(1).catch(err => {
            console.error(err.message, err.stack);
        });
        if(versionData){
            res.status(200).json({
                message: "success",
                version: versionData.version_name
            })
        }else{
            res.status(404).json({
                message: "failed"
                        })
        }
        
    } catch (ex) {
        console.error(ex.message, ex.stack);
    }
});

module.exports = router
