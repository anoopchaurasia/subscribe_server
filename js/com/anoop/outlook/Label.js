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


    async function sendRequestInBatch(accessToken, reqArray) {
        console.log(reqArray);
        var settings = {
            "url": encodeURI("https://graph.microsoft.com/v1.0/$batch"),
            "method": "POST",
            "headers": {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            "body": JSON.stringify({ "requests": reqArray })
        }
        let response = await axios(settings).catch(e => console.error(e.message, "folder access error"));
        console.log(response)
        return response.data;
    }


    ///---------------from inbox ------------
    Static.moveMailFromInbox =async function(accessToken, mailIdList,label_id){
        return await sendMailToBatchProcess(accessToken,mailIdList,label_id);
    };

    Static.moveInboxToUnsub = async function(gmail, mailIdList) {
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            addLabelIds: [gmail.authToken.label_id],
            removeLabelIds: ["INBOX"]
        });
    };

    ////----------------------------unsub

    Static.moveUnsubToInbox = async function(gmail, mailIdList) {
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            addLabelIds: ["INBOX"],
            removeLabelIds: [gmail.authToken.label_id]
        });
    };

    Static.moveUnsubToTrash = async function(gmail, mailIdList) {
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            addLabelIds: ["TRASH"],
            removeLabelIds: [gmail.authToken.label_id]
        });
    };

    ////--------------------------trash

    Static.moveTrashToInbox = async function(gmail, mailIdList) {
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            addLabelIds: ["INBOX"],
            removeLabelIds: ["TRASH"]
        });
    };

    Static.moveTrashToUnsub = async function(gmail, mailIdList) {
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            addLabelIds: [gmail.authToken.label_id],
            removeLabelIds: ["TRASH"]
        });
    };

    Static.create = async function (gmail, name="Unsubscribed Emails"){
        const res = await gmail.users.labels.create({
            userId: 'me',
            resource: {
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
                "name": name
            }
        }).catch(err => {
            console.error(err.message,"81");
            return
        });
        return res;
    };
})