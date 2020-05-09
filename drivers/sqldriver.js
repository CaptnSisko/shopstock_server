const mysql = require('mysql');
const secret = require('../secret.json');

var pool;

exports.setup = () => {
  pool = mysql.createPool({
    host: 'localhost',
    user: secret.db_user,
    password: secret.db_pass,
    port: 3306,
    database: 'shopstock'
  });
};

exports.getPool = () => { return pool; };

exports.getAllItems = (callback) => {
  var sql = 'SELECT * FROM item_lookup';

  pool.query(sql, (err, result) => {
    var items = [];
    for (var i in result) {
      items.push({
        id: result[i].id,
        name: result[i].name,
        'item-category': result[i].category
      });
    }
    callback(err, items);
  });
};

exports.getAllItemCategories = callback => {
  var sql = 'SELECT * FROM item_category_lookup';

  pool.query(sql, (err, result) => {
    var itemCategories = [];
    for (var i in result) {
      itemCategories.push({
        id: result[i].id,
        name: result[i].name
      });
    }
    callback(err, itemCategories);
  });
};

exports.getStoresInArea = (lat1, lat2, long1, long2, callback) => {
  var sql =
    'SELECT * FROM store_lookup WHERE gps_lat > ? AND gps_lat < ? AND gps_long > ? AND gps_long < ?';

  pool.query(sql, [lat1, lat2, long1, long2], (err, result) => {
    var stores = [];
    for (var i in result) {
      stores.push({
        id: result[i].id,
        name: result[i].name,
        address: result[i].address,
        lat: result[i].gps_lat,
        long: result[i].gps_long
      });
    }
    callback(err, stores);
  });
};

exports.sendReport = (
  inStock,
  noStock,
  userId,
  storeId,
  timestamp,
  callback
) => {
  var sql = 'INSERT INTO reports VALUES (NULL, ?, ?, ?, ?, FROM_UNIXTIME(?))';

  for (var i in inStock) {
    pool.query(
      sql,
      [userId, inStock[i], storeId, true, timestamp],
      (err, result) => {
        if (err) callback(err, { success: false });
      }
    );
  }

  for (i in inStock) {
    pool.query(
      sql,
      [userId, inStock[i], storeId, false, timestamp],
      (err, result) => {
        if (err) callback(err, { success: false });
      }
    );
  }
  callback(undefined, { success: true });
};

exports.getStoreReports = (storeId, callback) => {
  var sql =
    'SELECT * FROM reports WHERE storeId = ? AND timestamp > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)';

  pool.query(sql, [storeId], (err, result) => {
    var reports = [];
    for (var i in result) {
      reports.push({
        id: result[i].id,
        userId: result[i].userId,
        item_id: result[i].item_id,
        storeId: result[i].storeId,
        inStock: result[i].inStock,
        timestamp: result[i].timestamp
      });
    }
    callback(err, reports);
  });
};

exports.getUserReports = (userId, callback) => {
  var sql =
    'SELECT id, userId, item_id, storeId, inStock, UNIX_TIMESTAMP(timestamp) FROM reports WHERE userId = ? AND timestamp > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 WEEK) ORDER BY timestamp ASC';

  pool.query(sql, [userId], (err, result) => {
    var reports = [];
    for (var i in result) {
      reports.push({
        id: result[i].id,
        userId: result[i].userId,
        item_id: result[i].item_id,
        storeId: result[i].storeId,
        inStock: result[i].inStock,
        timestamp: result[i]['UNIX_TIMESTAMP(timestamp)']
      });
    }
    callback(err, reports);
  });
};
