fm.Package("com.anoop.outlook");
var Request = require('request');
fm.Class("Message", function (me) {
    'use strict'
    this.setMe = _me => me = _me;

    Static.getHookMail = async function (accessToken, link) {
        var settings = {
            "url": link,
            "method": "GET",
            "headers": {
                'Authorization': 'Bearer ' + accessToken
            }
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                console.log(error)
                return null;
            }
            if (body) {
                return body;
            }
        });
    }

    Static.getMailFolders = async function (accessToken) {
        var settings = {
            "url": "https://graph.microsoft.com/v1.0/me/mailFolders",
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                console.log(error);
            }
            if (body) {
                return JSON.parse(body);
            }
        });
    }

    Static.getBulkEmail = async function(accessToken,link){
        var settings = {
            "url": link,
            "method": "GET",
            "headers": {
                'Authorization': 'Bearer ' + accessToken
            }
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                return JSON.parse(body);
            }
        });
    }


})