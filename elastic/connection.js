var elasticsearch=require('elasticsearch');
module.exports = function(){
  return new elasticsearch.Client( {  
    hosts: [
      process.env.ELASTIC_URL
    ]
  });
}; 