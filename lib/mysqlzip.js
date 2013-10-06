
var MongoClient = require('mongodb').MongoClient,
    mysql = require('mysql');


mysql_conn = require('./lib/mysqlconn');

MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
  if(err) throw err;

  // insert zip_code
  var insertZip = function(zip_code, county_id) {
    mysql_conn.query('INSERT INTO zip_code SET ?', { zip_code: zip_code, county_id: county_id }, function(err, result) {
      if(err) {
        console.log(zip_code, county_id, err);
      } else {
        console.log('zip inserted', zip_code);
      }
    });
  };

  // insert county
  var insertCounty = function(new_zip) {
    mysql_conn.query('INSERT INTO lookup_county SET ?', { county_name: new_zip.county, state: new_zip.state }, function(err, result) {
      if(err) {
        console.log(new_zip.county, new_zip.state, err);
//         process.exit();
      } else {
        console.log('insert county', new_zip.county, new_zip.state);
        return insertZip(new_zip.zip, result.insertId);
      }
    });
  };


  // get zips from MYSQL test.zip_codes
  mysql_conn.query('SELECT zip_code FROM zip_code', function(err, done_zips) {
    if(err) throw err;


console.log('done_zips.length', done_zips.length);
// return process.exit();


    // build array of zip_codes for mongo query
    var zip_array = [];
    if(done_zips.length > 0)for(var i = 0; i < done_zips.length; i++) {
      zip_array.push(done_zips[i]['zip_code']+'');
    }


console.log('zip_array.length', zip_array.length);
// return process.exit();
    
    
    // get zips from MONGO test.zips where not in zip array
    db.collection('zips').find({ zip: { $nin: zip_array } }, { _id: 0, zip: 1, county: 1, state: 1 }).toArray(function(err, new_zips) {
      if(err) throw err;


console.log('new_zips.length', new_zips.length);
// return process.exit();
      
      
      if(new_zips && new_zips.length > 0) for(var j = 0; j < new_zips.length; j++) {
        // attempt to get county_id from MYSQL using county and state
        (function(new_zip) {
          var sql = 'SELECT county_id FROM lookup_county WHERE county_name = '+mysql_conn.escape(new_zip['county'])+' AND state = '+mysql_conn.escape(new_zip['state']);
          mysql_conn.query(sql, function(err, counties) {
            if(err) throw err;
            
// console.log('counties.length [should be 1]', counties.length, counties[0]['county_id']);
// return process.exit();
            
            if(counties.length == 0) return insertCounty(new_zip);
            return insertZip(new_zip['zip'], counties[0]['county_id']);
          });
        })(new_zips[j]);
      }

    });

  });

});
