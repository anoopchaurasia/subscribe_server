let translator = require("./google_translation");
let mongoose_labels = require("./../models/labelData");

module.exports.map = async function(labels, provider){
    
    if(provider==="gmail") {
        return await handleGmail(labels);
    }
    return labels.map(x=>[x,x])
};

function hasTrashAndAll(labels) {
    let has_all_email= false, has_trash_email = false; 
    labels.forEach(x=> {
        if(x === "[Gmail]/All Email") has_all_email = true;
        if(x === "[Gmail]/Trash") has_trash_email = true;
    });
    return has_all_email && has_trash_email;
}

async function handleGmail(labels) {
    let has_both =  hasTrashAndAll(labels);
    if(has_both) return labels.map(x=>[x,x]);
    let list = await mongoose_labels.find({label_name: {$in: labels}, en_name: {$exists: true}}, {en_name: 1, label_name:1}).lean().exec();
    has_both = hasTrashAndAll(list.map(x=>x.en_name));
    if(has_both) return list.map(x=>[x.label_name,x.en_name]);    
    let translated = (await translator.translate(labels)).data.translations.map((x)=>  x.translatedText.replace(/\s\/\s/, "/").replace(/\[Google Mail\]/, "[Gmail]") );
    return labels.map((x,i )=> [x, translated[i]])
}