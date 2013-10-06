
var mysql = require('mysql');

mysql_conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'test',
  password: ''
});

mysql_conn.connect();

module.exports = mysql_conn;
