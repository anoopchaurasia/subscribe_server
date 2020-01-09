fm.Package('com.anoop.imap')
fm.Import("com.jeet.memdb.RedisDB")
fm.Class('RedisPush', function (me, RedisDB) {
    'use strict';
    this.setMe = _me => me = _me;


    Static.addImapAction = async function (action, args) {
        RedisDB.base.pushData('imap_user_actions', { args, action });
    };

    Static.addDBAction = async function (args) {
        RedisDB.base.pushData('db_user_actions', { args });
    };

    Static.addQCDBAction = async function (action,args) {
        RedisDB.base.pushData('qc_db_user_actions', { args,action });
    };

    ///---------------- unused
    // ImapRedisPush.unusedToKeep
    Static.unusedToKeep = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "keep"]);
    };
    // ImapRedisPush.unusedToTrash
    Static.unusedToTrash = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "trash"]);
        me.addImapAction("unusedToTrash", [user._id.toHexString(), from_email]);
    };
    // ImapRedisPush.unusedToUnsub
    Static.unusedToUnsub = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "move"]);
        me.addImapAction("unusedToUnsub", [user._id.toHexString(), from_email]);
    };
    ///--------------- keep
    // ImapRedisPush.keepToTrash
    Static.keepToTrash = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "trash"]);
        me.addImapAction("keepToTrash", [user._id.toHexString(), from_email]);
    };
    // ImapRedisPush.keepToUnsub
    Static.keepToUnsub = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "move"]);
        me.addImapAction("keepToUnsub", [user._id.toHexString(), from_email]);
    };
    ///------------- move
    // ImapRedisPush.unsubToKeep
    Static.unsubToKeep = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "keep"]);
        me.addImapAction("unsubToKeep", [user._id.toHexString(), from_email]);
    };
    // ImapRedisPush.unsubToTrash
    Static.unsubToTrash = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "trash"]);
        me.addImapAction("unsubToTrash", [user._id.toHexString(), from_email]);
    };
    ///----------------trash
    // ImapRedisPush.trashToKeep
    Static.trashToKeep = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "keep"]);
        me.addImapAction("trashToKeep", [user._id.toHexString(), from_email]);
    };
    /// not in use
    Static.trashToUnsub = async function (user, from_email) {
        me.addDBAction([user._id.toHexString(), from_email, "move"]);
        me.addImapAction("trashToUnsub", [user._id.toHexString(), from_email]);
    };


    Static.extractAllEmail = async function (user) {
        RedisDB.base.lPush('qc_scan_user_boxes', user._id.toHexString());
    }
    Static.deleteBySender = async function (user, start_date, end_date, from_emails) {
        me.addQCDBAction("updateDeleteDbBySender",[user._id.toHexString(), start_date,end_date,from_emails])
        me.addImapAction("deleteBySender", [user._id.toHexString(), start_date,end_date,from_emails]);
    }

    Static.deleteByLabel = async function (user, start_date, end_date, from_emails) {
        me.addQCDBAction("updateDeleteDbByLabel",[user._id.toHexString(), start_date,end_date,from_emails])
        me.addImapAction("deleteByLabel", [user._id.toHexString(), start_date,end_date,from_emails]);
    }

    Static.deleteBySize = async function (user, start_date, end_date, from_emails) {
        me.addQCDBAction("updateDeleteDbBySize",[user._id.toHexString(), start_date,end_date,from_emails])
        me.addImapAction("deleteBySize", [user._id.toHexString(), start_date,end_date,from_emails]);
    }

});