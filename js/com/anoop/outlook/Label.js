fm.Package("com.anoop.outlook");
fm.Class("Label>.Message", function(me){
    'use strict'
    this.setMe=_me=>me=_me;

    this.Label = function(){

    };
    ///---------------from inbox ------------
    Static.moveInboxToTrash =async function(gmail, mailIdList){
        return await me.batchModify(gmail,  {
            'ids': mailIdList,
            'addLabelIds': ["TRASH"]
        });
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