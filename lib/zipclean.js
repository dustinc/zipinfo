
var mysql_conn = require('./lib/mysqlconn'),
    request = require('request'),
    cluster = require('cluster');


if(cluster.isMaster) {
  
  cluster.fork();
  
  cluster.on('exit', function(worker, code, signal) {
    console.log('forking...');
    cluster.fork();
  });
  
} else {

var sql = "select site_id, address_1, city, state from site where zip = '' and city != '' and state != '' and address_1 != '' limit 1";

var fixQuery = function(query) {
  return query.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '+');
};

mysql_conn.query(sql, function(err, sites) {
  if(err) throw err;
  if(sites.length == 0) return process.exit();
  console.log(sites.length);
  
  for(var i = 0; i < sites.length; i++) {
    (function(site) {
      var addr_str = fixQuery(site.address_1+',+'+site.city+',+'+site.state);
      var request_url = "http://maps.googleapis.com/maps/api/geocode/json?address="+addr_str+"&sensor=false";

      request(request_url, function(err, res, data) {
        if(err) throw err;

        data = JSON.parse(data);
        
        if(!data.results[0]) {
          console.log('data fail', data);
          process.exit();
        }
        
        for(var j = 0; j < data.results.length; j++) {
          
          if(data.results[j].address_components)for(var k = 0; k < data.results[j].address_components.length; k++) {
            
            if(data.results[j].address_components[k].types[0] == 'postal_code') {
              
              var zip = data.results[j].address_components[k].long_name;
              
              return (function(site, zip) {
                console.log('updating site...');
                var sql = "UPDATE site SET zip = "+mysql_conn.escape(zip)+" WHERE site_id = "+mysql_conn.escape(site.site_id);
                mysql_conn.query(sql, function(err, results) {
                  if(err) throw err;
                  console.log('site update', site.site_id, zip);
                  console.log('wait...');
                  setTimeout(function() {
                    console.log('exiting...');
                    process.exit();
                  }, 400);
                });
              })(site, zip);
              
            } else if(j == data.results.length - 1 && k == data.results[j].address_components.length - 1) {
              console.log('zip not found');
              mysql_conn.query("UPDATE site SET zip = 10101 WHERE site_id = "+mysql_conn.escape(site.site_id), function(err, results) {
                console.log('wait...');
                setTimeout(function() {
                  console.log('exiting...');
                  process.exit();
                }, 400);
              });
              
            }
          }
        }
        
      });    
    })(sites[i]);
  }
});

}
