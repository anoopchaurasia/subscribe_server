let translator = require("./google_translation");
let mongoose_labels = require("./../models/labelData");

module.exports.map = async function(labels, provider){
    
    if(provider==="gmail") {
        return await handleGmail(labels);
    } else {
        return await handleNonGmail(labels);
    }
};

function hasTrashAndAll(labels) {
    let has_all_email= false, has_trash_email = false; 
    labels.forEach(x=> {
        if(x.toLowerCase() === "[gmail]/all email") has_all_email = true;
        if(x.toLowerCase() === "[gmail]/trash" || x.toLowerCase() === "[gmail]/bin") has_trash_email = true;
    });
    return has_all_email && has_trash_email;
}

async function handleGmail(labels) {
    let has_both =  hasTrashAndAll(labels);
    if(has_both) return labels.map(x=>[x,x]);
    let list = await mongoose_labels.find({label_name: {$in: labels}, en_name: {$exists: true}}, {en_name: 1, label_name:1}).lean().exec();
    has_both = hasTrashAndAll(list.map(x=>x.en_name));
    if(has_both) return list.map(x=>[x.label_name,x.en_name]); 
    console.log("translated")   
    let translated = (await translator.translate(labels)).data.translations.map((x)=>  x.translatedText.replace(/\s\/\s/, "/").replace(/\[Google Mail\]/, "[Gmail]").toLowerCase() );
    return labels.map((x,i )=> [x, translated[i]])
}


function hasTrashAndAllNon(labels) {
    let  has_trash_email = false; 
    labels.forEach(x=> {
        if(["deleted messages", "trash"].includes(x.toLowerCase())) has_trash_email = true;
    });
    return has_trash_email;
}

async function handleNonGmail(labels) {
    let has_both =  hasTrashAndAllNon(labels);
    if(has_both) return labels.map(x=>[x,x]);
    let list = await mongoose_labels.find({label_name: {$in: labels}, en_name: {$exists: true}}, {en_name: 1, label_name:1}).lean().exec();
    has_both = hasTrashAndAllNon(list.map(x=>x.en_name));
    if(has_both) return list.map(x=>[x.label_name,x.en_name]); 
    console.log("translated")   
    let translated = (await translator.translate(labels)).data.translations.map((x)=>  x.translatedText.replace(/\s\/\s/, "/").replace(/\[Google Mail\]/, "[Gmail]").toLowerCase() );
    return labels.map((x,i )=> [x, translated[i]])
}