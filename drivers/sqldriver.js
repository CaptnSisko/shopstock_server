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
        var stores = []
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
