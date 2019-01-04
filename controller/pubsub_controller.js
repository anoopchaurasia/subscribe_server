 let express = require('express');
//  let fcmInfo = require('../models/fcmInfo');
 let router = express.Router();
     router.get('/testingpubsub', function(req, res) {
         console.log("In pubsub CONTROLLER");
         res.send("In pubsub CONTROLLER");
    });
 /* let FCM = require('fcm-node');
 let serverKey = 'AAAAn2zoJwg:APA91bGA8zL_UlAH0J4fHyMh0RTZWosJBhfSSYnsCvwZV6NGnJ8tn_lU4rpJyrEN0wOgu-RFwdxcb9Pfx3ljP_AL22EJeT5i5s1lfZqojM9yJFL1td1JcQ_uknJgf8JYCcJT6EB6DWK2IDmcP6SOgRulVepKq-5bRg'; //put your server key here
 let fcm = new FCM(serverKey); */


 router.post('/getemail',async (req, res) => {
      console.log(req.body);
      if (!req.body || !req.body.message || !req.body.message.data) {
        return res.sendStatus(400);
      }
      console.log("checking in email api");
     const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64')
         .toString('utf8');
        var content;
         content = JSON.parse(dataUtf8encoded);
         console.log(content)
     res.sendStatus(200);
         //   const dataUtf8encoded = Buffer.from(req.body.message.data, 'base64')
    //     .toString('utf8');
    //   var content;
    //   try {
    //     content = JSON.parse(dataUtf8encoded);
    //     var emaildata = content.emailAddress;
    //     var historyId = content.historyId;
    //     fcmInfo.find({"email":emaildata},{'fcmToken': true,_id:false},async function(err, fcminfo) {
    //         if (err) {
    //                 console.log(err);
    //                 res.status(200).json({
    //                                error: false,
    //                                data: err
    //                            })
    //         }
    //         if(fcminfo){
    //           var tokens=[];
    //           console.log(fcminfo);
    //           for(const fcm of fcminfo){
    //               tokens.push(fcm.fcmToken);
    //           }
    //           console.log(content);
    //             var message = { 
    //               registration_ids:tokens,  
    //               // notification: {
    //               //     title: 'Pubsub Notification', 
    //               //     body: 'Body of your push notification' 
    //               // },
                  
    //               data: { 
    //                   emailAddress: emaildata,
    //                   historyId: historyId
    //               }
    //           };
              
    //           fcm.send(message,async function(err, response){
    //               if (err) {
    //                   console.log(err);
    //                   console.log("Something has gone wrong!");
    //                   // res.sendStatus(400);
    //                   // res.status(200).json({
    //                   //              error: false,
    //                   //              data: err
    //                   //          })
    //               } else {
    //                   console.log("Successfully sent with response: ", response);
    //                    // res.sendStatus(200);
    //               }
    //           });
    //         } 
    //     });
    //     console.log("done");
    //     res.sendStatus(200);
    //   } catch (ex) {
    //     return res.sendStatus(400);
    //   }
});

 module.exports = router