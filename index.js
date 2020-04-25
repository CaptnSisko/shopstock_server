const express = require('express');
const secret = require('./secret.json');

const app = express();
const port = secret['port'];
const version = 0.1;

const db = require('./drivers/sqldriver.js');
db.setup();

app.get('/api', (req, res) => {
	res.json({
		'api-version': version,
		'success': true
	});
});

app.get('/api/send_report', (req, res) => {
	var in_stock = req.query.in_stock_items;
	var no_stock = req.query.no_stock_items;
	if([in_stock, no_stock].includes(undefined)) {
		res.json({
			'success': false
		});
		// TODO handle error
	} else {
		in_stock_arr = in_stock.split(',').map(s => Math.floor(Number(s)));
		no_stock_arr = no_stock.split(',').map(s => Math.floor(Number(s)));
		if(in_stock_arr.includes(NaN) || no_stock_arr.includes(NaN)) {
			res.json({
				'success': false
			});
			// TODO handle error
		} else {
			console.log(in_stock_arr)
			console.log(no_stock_arr)
			res.json({
				'success': true
			});
		}
	}
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

app.get('/api/get_stores_in_area', (req, res) => {
	var lat_1 = Number(req.query.lat_1);
	var long_1 = Number(req.query.long_1);
	var lat_2 = Number(req.query.lat_2);
	var long_2 = Number(req.query.long_2);
	if([lat_1, long_1, lat_2, long_2].includes(undefined)) {
		res.json({
			'success': false
		})
		// TODO handle error
	} else if ([lat_1, long_1, lat_2, long_2].includes(NaN)) {
		res.json({
			'success': false
		})
		// TODO handle error
	} else {
		db.get_stores_in_area(lat_1, lat_2, long_1, long_2, (stores) => {
			res.json({
				'stores': stores,
				'success': true
			});
		});
	}
});

app.listen(port, () => console.log(`API listening on port ${port}!`))

