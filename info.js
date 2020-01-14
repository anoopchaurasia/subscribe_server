var client = require('./elastic/connection.js');

client.cluster.health({},function(err,resp,status) {  
  console.log("-- Client Health --",resp);
});

client.count({index: 'user',type: 'user'},function(err,resp,status) {  
    console.log("constituencies",resp);
  });
