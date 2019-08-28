fm.Package("com.anoop.outlook");
fm.Class("Header", function(me){
    'use strict'
    this.setMe=_me=>me=_me;

    this.Header = function(headerlist) {
        headerlist.forEach(x=> {
            me[x.name.toLowerCase()] = x.value; 
        });
    };
});
