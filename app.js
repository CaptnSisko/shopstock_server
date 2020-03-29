const express = require('express');
const fs = require('fs');
const mysql = require('mysql');
const secret = require('./secret.json');

const app = express();
const port = 3000;
const version = 0.1;

var sql = 'SELECT 1'

var con = mysql.createConnection({
  host: "localhost",
  user: secret['db_user'],
  password: secret['db_pass'],
  database: "shopstock"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to SQL db!");
});

app.get('/api', (req, res) => {
	res.json({
		'api-version': version
	});
	}
);

app.get('/api/get_items', (req, res) => {
	var sql = 'SELECT * FROM item_lookup';
	var items = {};
	var item_categories = {};
	con.query(sql, (err, result) => {
		if(err) throw err;
		for(i in result) {
			items[result[i].id] = {
				'name': result[i].name,
				'item-category': result[i].category
			}
		}
		sql = 'SELECT * FROM item_category_lookup';
		con.query(sql, (err, result) => {
			if(err) throw err;
			for (i in result) {
				item_categories[result[i].id] = {
					'name': result[i].name
				};
			}
			res.json({
				'items': items,
				'item-categories': item_categories
			});
		});
	});
});

app.get('/api/get_stores_in_area', (req, res) => {
	var lat_1 = Number(req.query.lat_1);
	var long_1 = Number(req.query.long_1);
	var lat_2 = Number(req.query.lat_2);
	var long_2 = Number(req.query.long_2);
	stores = {};
	store_categories = {};
	store_chains = {};
	con.query('SELECT * FROM store_lookup WHERE gps_lat > ? AND gps_lat < ? AND gps_long > ? AND gps_long < ?', [lat_1, lat_2, long_1, long_2], (err, result) => {
		if(err) throw err;
		for (i in result) {
			stores[result[i].id] = {
				'name': result[i].name,
				'address': result[i].address,
				'lat': result[i].gps_lat,
				'long': result[i].gps_long,
				'store-category': result[i].category_id,
				'store-chain': result[i].chain_id
			}
		}
		con.query('SELECT * FROM store_category_lookup', (err, result) => {
			if(err) throw err;
			for (i in result) {
				store_categories[result[i].id] = {
					'name': result[i].name,
					'item-categories': result[i].item_category_ids
				}
			}
			con.query('SELECT * FROM chain_lookup', (err, result) => {
				if(err) throw err;
				for (i in result) {
					store_chains[result[i].id] = {
						'name': result[i].name
					}
				}
				res.json({
					'stores': stores,
					'store-categories': store_categories,
					'store-chains': store_chains
				});
			});
		});
		//res.json({
		//	'stores': stores
		//});
	});
	

});

app.listen(port, () => console.log(`API listening on port ${port}!`))

