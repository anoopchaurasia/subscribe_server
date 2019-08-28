fm.Package("com.anoop.outlook");
fm.Import(".Outlook");
fm.Import(".Scraper");
fm.Import(".Label");
fm.Import(".ScraperMailSend");
var uniqid = require('uniqid');
fm.Class("Controller>com.anoop.email.BaseController", function(me, Outlook, Scraper, Label, ScraperMailSend){
    'use strict'
    this.setMe=_me=>me=_me;


    Static.getOutlookUrl = async function(){
        const stateCode = uniqid() + "outlook" + uniqid();
        let oauth2 = await Outlook.getOutlookInstance();
        const returnVal = oauth2.authorizationCode.authorizeURL({
            redirect_uri: process.env.REDIRECT_URI,
            scope: process.env.APP_SCOPES,
            state: stateCode
        });
        await me.createOutlookUser(stateCode);
        return returnVal;
    }

    // Static.extractEmail = async function(token){
    //     let gmailInstance = await Gmail.getInstanceForUser(token.user_id);
    //     let scraper = Scraper.new(gmailInstance);
    //     scraper.start(me, async function afterEnd(){
    //        await me.handleRedis(token.user_id);
    //     });
    // }

    // Static.extractAndSendMailToScraper = async function(user_id, cb) {
    //     let gmailInstance = await Gmail.getInstanceForUser(user_id);
    //     if(gmailInstance.error) return console.error(gmailInstance.error)
    //     let scraper = ScraperMailSend.new(gmailInstance);
    //     await scraper.start(cb);
    // }

    // Static.extractAndSendMailBasedOnSender = async function(user_id, senders, cb) {
    //     let gmailInstance = await Gmail.getInstanceForUser(user_id);
    //     if(gmailInstance.error) return console.error(gmailInstance.error);
    //     let scraper = ScraperMailSend.new(gmailInstance);
    //     await scraper.getEmaiIdsBySender(senders, cb);
    // }
});