var elasticsearch=require('elasticsearch');

var client = new elasticsearch.Client( {  
  hosts: [
    process.ELASTIC_URL
  ]
});

module.exports = client; 