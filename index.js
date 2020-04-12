const express = require('express');

const app = express();
const port = 3000;
const version = 0.1;

const db = require('./drivers/sqldriver.js');
db.setup();

app.get('/api', (req, res) => {
	res.json({
		'api-version': version,
		'success': true
	});
});

app.get('/api/get_items', (req, res) => {
	db.get_all_items((items) => {
		db.get_all_item_categories((item_categories) => {
			res.json({
				'items': items,
				'item_categories': item_categories,
				'success': true
			});
		});
	});
});

app.get('/api/get_chains', (req, res) => {
	db.get_all_chains((chains) => {
		res.json({
			'chains': chains,
			'success': true
		});
	});
});

app.get('/api/get_store_categories', (req, res) => {
	db.get_all_store_categories((categories) => {
		res.json({
			'categories': categories,
			'success': true
		});
	});
});

app.get('/api/get_stores_in_area', (req, res) => {
	var lat_1 = Number(req.query.lat_1);
	var long_1 = Number(req.query.long_1);
	var lat_2 = Number(req.query.lat_2);
	var long_2 = Number(req.query.long_2);
	db.get_stores_in_area(lat_1, lat_2, long_1, long_2, (stores) => {
		res.json({
			'stores': stores,
			'success': true
		});
	});
});

app.listen(port, () => console.log(`API listening on port ${port}!`))
