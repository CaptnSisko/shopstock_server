const mysql = require('mysql');
const secret = require('../secret.json');

var con;

exports.setup = () => {
    con = mysql.createConnection({
        host: "localhost",
        user: secret['db_user'],
        password: secret['db_pass'],
        database: "shopstock"
    });
    con.connect((err) => {
        if (err) throw err;
        console.log("Connected to SQL db!");
    });
};

exports.get_all_items = (callback) => {
    var sql = 'SELECT * FROM item_lookup';

    con.query(sql, (err, result) => {
        if(err) throw err;
        var items = [];
        for(i in result) {
			items.push({
                'id': result[i].id,
				'name': result[i].name,
				'item-category': result[i].category
			});
        }
        callback(items);
    });
};

exports.get_all_item_categories = (callback) => {
    sql = 'SELECT * FROM item_category_lookup';

    con.query(sql, (err, result) => {
        if(err) throw err;
        var item_categories = []
        for (i in result) {
            item_categories.push({
                'id': result[i].id,
                'name': result[i].name
            });
        }
        callback(item_categories)
    });

};

exports.get_stores_in_area = (lat_1, lat_2, long_1, long_2, callback) => {
    sql = 'SELECT * FROM store_lookup WHERE gps_lat > ? AND gps_lat < ? AND gps_long > ? AND gps_long < ?';

    con.query(sql, [lat_1, lat_2, long_1, long_2], (err, result) => {
        if(err) throw err;
        var stores = [];
		for (i in result) {
			stores.push({
                'id': result[i].id,
				'name': result[i].name,
				'address': result[i].address,
				'lat': result[i].gps_lat,
				'long': result[i].gps_long,
			});
        }
        callback(stores); 
    });
};

exports.send_report = (in_stock, no_stock, user_id, store_id, timestamp, callback) => {
    sql = 'INSERT INTO reports VALUES (NULL, ?, ?, ?, ?, FROM_UNIXTIME(?))';

    for(i in in_stock) {
        con.query(sql, [user_id, in_stock[i], store_id, true, timestamp], (err, result) => {
            if(err) { 
                throw err;
                callback({'success': false})
            }
        });
    }

    for(i in in_stock) {
        con.query(sql, [user_id, in_stock[i], store_id, false, timestamp], (err, result) => {
            if(err) {
                throw err;
                callback({'success': false})
            }
        });
    }
    callback({'success': true});
};

exports.get_store_reports = (store_id, callback) => {
    sql = 'SELECT * FROM reports WHERE store_id = ? AND timestamp > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)';

    con.query(sql, [store_id], (err, result) => {
        if(err) throw err;
        var reports = [];
		for (i in result) {
			reports.push({
                'id': result[i].id,
                'user_id': result[i].user_id,
                'item_id': result[i].item_id,
                'store_id': result[i].store_id,
                'in_stock': result[i].in_stock,
                'timestamp': result[i].timestamp
			});
        }
        callback(reports); 
    });
};

exports.get_user_reports = (user_id, callback) => {
    sql = 'SELECT id, user_id, item_id, store_id, in_stock, UNIX_TIMESTAMP(timestamp) FROM reports WHERE user_id = ? AND timestamp > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 WEEK) ORDER BY timestamp ASC';

    con.query(sql, [user_id], (err, result) => {
        if(err) throw err;
        var reports = []
		for (i in result) {
			reports.push({
                'id': result[i]['id'],
                'user_id': result[i]['user_id'],
                'item_id': result[i]['item_id'],
                'store_id': result[i]['store_id'],
                'in_stock': result[i]['in_stock'],
                'timestamp': result[i]['UNIX_TIMESTAMP(timestamp)']
			});
        }
        callback(reports);
    });
};

