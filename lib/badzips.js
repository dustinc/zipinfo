
var MongoClient = require('mongodb').MongoClient;

MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
  if(err) throw err;

  var unassignedZip = function(zip, i) {
    db.collection('zip_html').update({ zip: zip }, { $set: { unassigned: true } }, function(err, num) {
      if(err) throw err;
      console.log('unassigned zip', zip, i);
    });
  };

  var needsAttention = function(zip, i) {
    db.collection('zip_html').update({ zip: zip }, { $set: { needs_attention: true } }, function(err, num) {
      if(err) throw err;
      console.log('needs attention', zip, i);
    });
  };

  db.collection('zip_html').find({ bad: true, unassigned: { $ne: true }, needs_attention: { $ne: true } }).toArray(function(err, docs) {
    if(err) throw err;

    if(docs.length > 0)for(var i = 0; i < docs.length; i++) {
      var m = docs[i]['html'].match('ZIP code '+docs[i]['zip']+' is not currently assigned by the US Postal Service to any city');
      if(m && m.length > 0) {
        unassignedZip(docs[i]['zip'], i);
      } else {
        needsAttention(docs[i]['zip'], i);
      }
    }
  });
});
