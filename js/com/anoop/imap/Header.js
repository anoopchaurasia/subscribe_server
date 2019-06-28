fm.Package("com.anoop.imap");
fm.Class("Header", function (me) {
    this.setMe = _me => me = _me;

    this.Header = function (headerlist) {
        headerlist.forEach(x => {
            me[x.name.toLowerCase()] = x.value;
        });
    };
});
