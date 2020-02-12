let https = require("https");
let default_opts = {
    host: "translation.googleapis.com",
    method:"POST",
    path: "/language/translate/v2?key=AIzaSyCD2m3LdhAez12oAQLdaUTmYJgbc-HAwIc",
    headers:{
        "Content-Type": "application/json"
    }
}

module.exports.translate = async function(label_list) {
    return new Promise((resolve, reject)=>{
        let req = https.request(default_opts, res=>{
            let chunks = "";
            res.on("data", x=> chunks+=x);
            res.on("end", ()=> resolve(JSON.parse(chunks)));
        });
        req.on("error", err=> {console.error(err); reject(err)});
        req.write(JSON.stringify({
            q: label_list,
            target: "DE"
        }));
        req.end()
    })
};