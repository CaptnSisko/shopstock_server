const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const Recaptcha = require('express-recaptcha').RecaptchaV2;
const fs = require('fs');

const secret = require('./secret.json');
const saltRounds = 10;

const app = express();
const port = secret['port'];
const version = 0.1;

const recaptcha = new Recaptcha(secret['recaptcha_site_key'], secret['recaptcha_secret_key']);

const reliability_calc = require('./math/reliability_calculator.js');
const confidence_calc = require('./math/confidence_calculator.js');

const success_template = fs.readFileSync('html/success.html','utf8');
const failure_template = fs.readFileSync('html/failure.html','utf8');

const user_manager = require('./drivers/usermanager.js');
const db = require('./drivers/sqldriver.js');
db.setup();
user_manager.setup(db);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/api', (req, res) => {
	res.json({
		'api-version': version,
		'success': true
	});
});

app.post('/api/send_report', (req, res) => {
	var in_stock = req.body.in_stock_items;
	var no_stock = req.body.no_stock_items;
	var store_id = req.body.store_id;
	var timestamp = req.body.timestamp;
	var key = req.body.key;

	if([in_stock, no_stock, store_id, timestamp, key].includes(undefined)) {
		res.status(400);
		res.json({
			'success': false
		});
		// TODO handle error
	} else {
		in_stock_arr = in_stock.map(s => Math.floor(Number(s)));
		no_stock_arr = no_stock.map(s => Math.floor(Number(s)));
		if(in_stock_arr.includes(NaN) || no_stock_arr.includes(NaN)) {
			res.status(400);
			res.json({
				'success': false
			});
			// TODO handle error
		} else {
			user_manager.authenticate_user(key, (user_id) => {
				if(user_id != null) {
					db.send_report(in_stock_arr, no_stock_arr, user_id, store_id, timestamp, (success) => {
						res.json(success);
					});
				} else {
					res.status(400);
					res.json({
						'success': false,
						'error': 'Invalid API key!'
					});
				}
			});
		}
	}
});

app.post('/api/create_account', (req, res) => {
	var name = req.body.name;
	var email = req.body.email;
	var password = req.body.password;

	if (name.length > 60 || email.length > 60 || password.length > 60) {
		res.status(400);
		res.json({
			'success': false
		});
		// TODO handle error
	}
	bcrypt.hash(password, saltRounds, function(err, hash) {
		if(err) {
			res.status(400);
			res.json({
				'success': false
			});
			// TODO handle error
		}
		user_manager.create_user(name, email, hash, (status) => {
			if(status['success'] == false) res.status(400);
			res.json(status);
		});
	});
});

app.post('/api/login', (req, res) => {
	var email = String(req.body.email);
	var password = String(req.body.password);
	var stay_logged_in = Boolean(req.body.stay_logged_in);

	if (email.length > 60 || password.length > 60) {
		res.status(400);
		res.json({
			'success': false
		});
		// TODO handle error
	}

	user_manager.login(email, password, stay_logged_in, bcrypt, (response) => {
		res.json(response);
	});
});

app.post('/api/logout', (req, res) => {
	var key = String(req.body.key);

	user_manager.logout(key, (response) => {
		if(response['success'] == false) res.status(400);
		res.json(response);
	});
});

app.post('/api/get_expire_time', (req, res) => {
	var key = String(req.body.key);

	user_manager.get_expire_time(key, (response) => {
		if(response['success'] == false) res.status(400);
		res.json(response);
	});
});

app.post('/api/change_password', recaptcha.middleware.verify, (req, res) => {
	var email = req.body.email;
	var password = req.body.password;
	var token = req.body.token;

	if (req.recaptcha.error) {
		res.status(400);
		res.set('Content-Type', 'text/html');
		res.set('Content-Type', 'text/html');
		res.send(failure_template.replace("{{error_msg}}", "Invalid Recaptcha response!"));
	} else {
		bcrypt.hash(password, saltRounds, function(err, hash) {
			if(err) {
				res.status(400);
				res.json({
					'success': false
				});
				// TODO handle error
			}
			user_manager.change_password(email, hash, token, (response) => {
				if (response['success']) {
					res.set('Content-Type', 'text/html');
					res.set('Content-Type', 'text/html');
					res.send(success_template);
				} else {
					res.status(400);
					res.set('Content-Type', 'text/html');
					res.set('Content-Type', 'text/html');
					res.send(failure_template.replace("{{error_msg}}", response['error']));
				}
			});
		});
	}
});

app.post('/api/request_change_password', recaptcha.middleware.verify, (req, res) => {
	var email = req.body.email;

	if (req.recaptcha.error) {
		res.status(400);
		res.set('Content-Type', 'text/html');
		res.send(failure_template.replace("{{error_msg}}", "Invalid Recaptcha response!"));
	} else {
		user_manager.password_reset_email(email,(response) => {
			if (response['success']) {
				res.set('Content-Type', 'text/html');
				res.send(success_template);
			} else {
				res.status(400);
				res.set('Content-Type', 'text/html');
				res.send(failure_template.replace("{{error_msg}}", response['error']));
			}
		});
	}
});

app.post('/api/resend_verification_email', recaptcha.middleware.verify, (req, res) => {
	var email = req.body.email;

	if (req.recaptcha.error) {
		res.status(400);
		res.set('Content-Type', 'text/html');
		res.send(failure_template.replace("{{error_msg}}", "Invalid Recaptcha response!"));
	} else {
		user_manager.resend_verification_email(email,(response) => {
			if (response['success']) {
				res.set('Content-Type', 'text/html');
				res.send(success_template);
			} else {
				res.status(400);
				res.set('Content-Type', 'text/html');
				res.send(failure_template.replace("{{error_msg}}", response['error']));
			}
		});
	}
});

app.get('/api/verify_email', (req, res) => {
	var email = req.query.email;
	var token = req.query.token;

	user_manager.verify_user(email, token, (response) => {
		if (response['success']) {
			res.set('Content-Type', 'text/html');
			res.send(success_template);
		} else {
			res.status(400);
			res.set('Content-Type', 'text/html');
			res.send(failure_template.replace("{{error_msg}}", response['error']));
		}
	});
});



app.get('/api/get_items', (req, res) => {
	var key = req.query.key;

	user_manager.authenticate_user(key, (user_id) => {
		if(user_id != null) {
			db.get_all_items((items) => {
				db.get_all_item_categories((item_categories) => {
					res.json({
						'items': items,
						'item_categories': item_categories,
						'success': true
					});
				});
			});
		} else {
			res.status(400);
			res.json({
				'success': false,
				'error': 'Invalid API key!'
			});
		}
	});
});

app.get('/api/get_stores_in_area', (req, res) => {
	var lat_1 = Number(req.query.lat_1);
	var long_1 = Number(req.query.long_1);
	var lat_2 = Number(req.query.lat_2);
	var long_2 = Number(req.query.long_2);
	var key = req.query.key;

	user_manager.authenticate_user(key, (user_id) => {
		if(user_id != null) {
			if([lat_1, long_1, lat_2, long_2].includes(undefined)) {
				res.status(400);
				res.json({
					'success': false
				})
				// TODO handle error
			} else if ([lat_1, long_1, lat_2, long_2].includes(NaN)) {
				res.status(400);
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
		} else {
			res.status(400);
			res.json({
				'success': false,
				'error': 'Invalid API key!'
			});
		}
	});

});

app.get('/api/test', (req, res) => {
	// reliability_calc.get_reliability(db, 0, (reliability) => {
	// 	res.status(400);
	// 	res.json(reliability);
	// });
});

app.listen(port, () => console.log(`API listening on port ${port}!`))

