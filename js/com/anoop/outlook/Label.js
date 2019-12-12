fm.Package("com.anoop.outlook");
var axios = require('axios');
fm.Class("Label>.Message", function(me){
    'use strict'
    this.setMe=_me=>me=_me;

    this.Label = function(){

    };

    async function sendMailToBatchProcess (accessToken,mailIds,label_id){
          if (mailIds.length <= 0) return;
          var msgIDS = mailIds.splice(0, 18);
          var batchRequest = [];
          for (let i = 0; i < msgIDS.length; i++) {
              var settings = {
                  "id": msgIDS[i],
                  "url": encodeURI("/me/messages/" + msgIDS[i] + "/move"),
                  "method": "POST",
                  "headers": {
                      'Content-Type': 'application/json',
                      'Authorization': 'Bearer ' + accessToken
                  },
                  "body": { "destinationId": label_id }
              }
              batchRequest.push(settings);
          }
          if (batchRequest.length > 0) {
             return await sendRequestInBatch(accessToken, batchRequest)
          }
          return await sendMailToBatchProcess(accessToken, mailIds, label_id);
    }


    async function sendMailToBatchProcessForRevert(accessToken,mailIds,source_id,destination_id){
        if (mailIds.length <= 0) return;
          var msgIDS = mailIds.splice(0, 18);
          var batchRequest = [];
          for (let i = 0; i < msgIDS.length; i++) {
            var settings = {
                "id": msgIDS[i],
                "url": encodeURI("/me/mailFolders/" + source_id + "/messages/" + msgIDS[i] + "/move"),
                "method": "POST",
                "headers": {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                "body": { "destinationId": destination_id }
            }
            batchRequest.push(settings);
          }
          if (batchRequest.length > 0) {
             return await sendRequestInBatch(accessToken, batchRequest)
          }
          return await sendMailToBatchProcess(accessToken, mailIds, label_id);
    }


    async function sendRequestInBatch(accessToken, reqArray) {
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/$batch"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "data": JSON.stringify({ "requests": reqArray })
        }
        let response = await axios(settings).catch(e => console.error(e.message, "send request in batch"));
        return response.data;
    }


    Static.moveOneMailFromInbox = async function(accessToken,emailId,folder_id){
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/me/messages/" + emailId + "/move"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "data": JSON.stringify({ "destinationId": folder_id })
        }
        let response = await axios(settings).catch(e => console.error(e.message, "move mail from inbox"));
        return response.data;
    }

    Static.createFolderForOutlook = async function(accessToken){
        var settings = {
            "url": "https://graph.microsoft.com/v1.0/me/mailFolders",
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "data": JSON.stringify({ "displayName": "Unsubscribed Emails" })
        }
        let response = await axios(settings).catch(e => console.error(e.message, "create folder"));
        return response.data;
    }

    async function checkForSubscription(accessToken){
        var settings = {
            "url": "https://graph.microsoft.com/v1.0/subscriptions",
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }
        let response = await axios(settings).catch(e => console.error(e.message, "get subscriptions"));
        return response.data.value.length>0;
    }

    Static.subscribeToNotification = async function(accessToken,user_id){
        let is_subscribed = await checkForSubscription(accessToken);
        if(!is_subscribed){
            var settingsubs = {
                "url": "https://graph.microsoft.com/v1.0/subscriptions",
                "method": "POST",
                "headers": {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                "data": JSON.stringify({
                    "changeType": "created",
                    "notificationUrl": "https://test.expensebit.com/ot/api/v2/mail/microsoft/getPushNotification",
                    "resource": "me/mailFolders('Inbox')/messages",
                    "expirationDateTime": new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000),
                    "applicationId": "25dc3c47-0836-4c00-9c6b-eea7f6073fad",
                    "creatorId": "635d4304-01c6-4829-9ba7-06d0401c0735",
                    "clientState": user_id
                })
            }
            let response = await axios(settingsubs).catch(e => console.error(e, "subscribe notification"));
            return response;
        }else{
            return
        }
    }


    ///---------------from inbox ------------
    Static.moveMailFromInbox =async function(accessToken, mailIdList,label_id){
        return await sendMailToBatchProcess(accessToken,mailIdList,label_id);
    };


    Static.reverMailForOutlook = async function(accessToken,mailIdList,source_id,destination_id){
        return await sendMailToBatchProcessForRevert(accessToken,mailIdList,source_id,destination_id);
    }

})