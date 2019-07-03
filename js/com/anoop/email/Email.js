fm.Package('com.anoop.email');
fm.Class('Email', function (me, EmailDetail, EmailInfo) {
    'use strict';
    this.setMe = function (_me) {
        me = _me;
    };
    Static.validate = function (email){
        if(me.email_reg.test(email)) return true;
        // throw new Error("Sender emailid is incorrect");
        return false
    }
    Static.email_reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
})