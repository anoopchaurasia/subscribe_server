fm.Package("com.anoop.gmail");
fm.Class("Gmail", function(me){
    this.setMe=_me=>me=_me;

    this.Header = function(headerlist) {
        headerlist.forEach(x=> {
            me[x.name.toLowerCase()] = x.value; 
        });
    };
});
