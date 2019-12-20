fm.Package('com.anoop.imap')
fm.Import("com.jeet.memdb.RedisDB")
fm.Class('RedisPush', function(me, me){
    'use strict';
    this.setMe=_me=>me=_me;
    
    
    Static.addDBAction = async function(action, args){
        RedisDB.pushData('imap_user_actions', {args, action});
    };
    
    Static.addImapAction = async function(args){
        RedisDB.pushData('db_user_actions', {args});
    };
    ///---------------- unused
    // ImapRedisPush.unusedToKeep
    Static.unusedToKeep = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "keep"]);
    };
    // ImapRedisPush.unusedToTrash
    Static.unusedToTrash = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "trash"]);
        me.addImapAction("unusedToTrash", [token, from_email]);
    };
    // ImapRedisPush.unusedToUnsub
    Static.unusedToUnsub = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "move"]);
        me.addImapAction("unusedToUnsub", [token, from_email]);
    };
    ///--------------- keep
    // ImapRedisPush.keepToTrash
    Static.keepToTrash = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "trash"]);
        me.addImapAction("keepToTrash", [token, from_email]);
    };
    // ImapRedisPush.keepToUnsub
    Static.keepToUnsub = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "move"]);
        me.addImapAction("keepToUnsub", [token, from_email]);
    };
    ///------------- move
    // ImapRedisPush.unsubToKeep
    Static.unsubToKeep = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "keep"]);
        me.addImapAction("unsubToKeep", [token, from_email]);
    };
    // ImapRedisPush.unsubToTrash
    Static.unsubToTrash = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "trash"]);
        me.addImapAction("unsubToTrash", [token, from_email]);
    };
    ///----------------trash
    // ImapRedisPush.trashToKeep
    Static.trashToKeep = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "keep"]);
        me.addImapAction("trashToKeep", [token, from_email]);
    };
    /// not in use
    Static.trashToUnsub = async function (token, from_email) {
        me.addDBAction([token.user_id, from_email, "move"]);
        me.addImapAction("trashToUnsub", [token, from_email]);
    };
});