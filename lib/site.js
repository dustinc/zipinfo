
var mysql_connn = require('./lib/mysqlconn');

mysql_conn.query('SELECT site_id, zip, county_id, state FROM site WHERE zip != ""', function(err, sites) {
  if(err) throw err;
  console.log('sites.length', sites.length);
  for(var i = 0; i < sites.length; i++) {
    (function(site) {
      var site_zip = site.zip.split('-')[0];
      var sql = 'SELECT z.county_id, c.state FROM zip_code z LEFT JOIN lookup_county c ON c.county_id = z.county_id WHERE z.zip_code = '+mysql_conn.escape(site_zip);
      mysql_conn.query(sql, function(err, zips) {
        if(err) throw err;
        if(zips.length == 0) return console.log('site zip wonky', site.site_id, site.zip);
        var zip = zips[0];
        if(zip.county_id != site.county_id || zip.state != site.state) {
          return (function(site, zip) {
            var sql = 'UPDATE site SET county_id = '+mysql_conn.escape(zip.county_id)+', state = '+mysql_conn.escape(zip.state)+' WHERE site_id = '+mysql_conn.escape(site.site_id);
            mysql_conn.query(sql, function(err, results) {
              if(err) throw err;
              console.log('site updated', site.site_id);
            });
          })(site, zip);
        }
      });
    })(sites[i]);
  }
});
