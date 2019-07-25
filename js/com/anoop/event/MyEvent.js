fm.Package('com.anoop.event');
const Raven = require('raven');
const UA = require("universal-analytics");
var ua = UA('UA-144565928-1')
fm.Class('MyEvent', function(me){
    'use strict';
    this.setMe=_me=>me=_me;
    
    this.shortHand = "MyEvent";
    Static.sentryCaptureException = function (err, options) {
        Raven.captureException(err, options);
    };
    
    Static.googleEvent = function ({category, action, label, value, params}, callback) {
        ua.event({
            ec: category,
            ea: action,
            el: label,
            ev: value,
            ep: params,
        }, callback).send();
    };
});