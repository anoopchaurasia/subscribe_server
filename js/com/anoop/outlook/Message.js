fm.Package("com.anoop.outlook");
var Request = require('request');
var axios = require('axios');
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
        let response = await axios(settings).catch(e => console.error(e.message, "update access token"));
        return response.data;
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
        let response = await axios(settings).catch(e => console.error(e.message, "folder access error"));
        return response.data;
    }

    Static.getBulkEmail = async function(accessToken,link){
        var settings = {
            "url": link,
            "method": "GET",
            "headers": {
                'Authorization': 'Bearer ' + accessToken
            }
        }
        let response = await axios(settings).catch(e => console.error(e.message, "update access token"));
        return response.data;
    }

})