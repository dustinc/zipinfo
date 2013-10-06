

var cluster = require('cluster'),
    os = require('os');

if(cluster.isMaster) {

  for(var i = 0; i < 2; i++)
    cluster.fork();

  // poor man's keep-alive
  cluster.on('exit', function(worker, code, signal) {
    console.log('forking...');
    cluster.fork();
  });

} else if(cluster.isWorker) {
console.log('worker', cluster.worker.id);

  var request = require('request'),
      MongoClient = require('mongodb').MongoClient,
      mysql = require('mysql'),
      mysql_conn,
      reg = /<td align=center>(.+?)<\/td>/gi,
      total = 0;

  // timed exit
  var timeToKill = function(total) {
    console.log('total', total);
    if(total == 10) {
      console.log('wait...');
      setTimeout(function() {
        console.log('exiting...');
        process.exit();
      }, 2000);
    }
  }


  // set mysql connection params
  mysql_conn = require('./lib/mysqlconn');


  // connect to mongo
  MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
    if(err) throw err;



    // Update Zip HTML
    var updateZipHtml = function(zip, update, total) {
      db.collection('zip_html').update({ zip: zip }, update, { upsert: true }, function(err, docs) {
        return timeToKill(total);
      });
    };


    // Process Response
    var processResponse = function(response, data, total) {
      var qs = response.request.uri.query.split('&'), q = {};
      for(var i = 0; i < qs.length; i++) {
        var sq = qs[i].split('=');
        q[sq[0]] = sq[1];
      }
      return updateZipHtml(q.zip, { request_url: response.request.href, zip: q.zip, html: data }, total);
    };


    // Make Request
    var makeRequest = function(zip, total) {
      var request_url = 'http://www.zip-info.com/cgi-local/zipsrch.exe?cnty=cnty&ac=ac&tz=tz&ll=ll&zip='+zip+'&Go=Go';
      var headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip,deflate,sdch",
        "Accept-Language": "en-US,en;q=0.8",
        "Connection": "keep-alive",
        "Host": "www.zip-info.com",
        "Referer:http": "//zipinfo.com/search/zipcode.htm",
        "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36",
      };

      // send request
      request({ url: request_url, headers: headers }, function(err, response, data) {
        if(err || response.statusCode != 200) {
          return timeToKill(total);
        }
        return processResponse(response, data, total);
      });
    };


    // get processed zips
    db.collection('zip_html').find({}, { _id: false, 'zip': true }).toArray(function(err, zips) {
      if(err) throw err;

      var zipcodes = [0];

      // build zip-only, single-dimensional array
      if(zips.length > 0) for(var i = 0; i < zips.length; i++) {
        zipcodes.push(zips[i]['zip']);
      }

      // join to string for sql command
      var zipcodes_str = zipcodes.join(',');

      var mysql_query = 'SELECT zip FROM zips WHERE zip NOT IN('+zipcodes_str+') ORDER BY zip LIMIT 10';

      // make mysql query
      mysql_conn.query(mysql_query, function(err, rows, fields) {
        if(err) throw err;

        // loop rows
        for(var i = 0; i < rows.length; i++) {
          makeRequest(rows[i]['zip'], i+1);
        }

      });

    });

  });

}
