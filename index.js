const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const Recaptcha = require('express-recaptcha').RecaptchaV2;
const fs = require('fs');

const secret = require('./secret.json');
const saltRounds = 10;

const app = express();
const port = secret.port;
const version = 0.1;

const recaptcha = new Recaptcha(secret.recaptcha_site_key, secret.recaptcha_secret_key);

// const reliabilitCalc = require('./math/reliability_calculator.js');
// const confidenceCalc = require('./math/confidence_calculator.js');

const successTemplate = fs.readFileSync('html/success.html', 'utf8');
const failureTemplate = fs.readFileSync('html/failure.html', 'utf8');

const userManager = require('./drivers/usermanager.js');
const db = require('./drivers/sqldriver.js');
db.setup();
userManager.setup(db);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/api', (req, res) => {
  res.json({
    'api-version': version,
    success: true
  });
});

app.post('/api/send_report', (req, res) => {
  var inStock = req.body.in_stock_items;
  var noStock = req.body.no_stock_items;
  var storeId = req.body.store_id;
  var timestamp = req.body.timestamp;
  var key = req.body.key;

  if ([inStock, noStock, storeId, timestamp, key].includes(undefined)) {
    res.status(400);
    res.json({
      success: false
    });
    // TODO handle error
  } else {
    var inStockArr = inStock.map(s => Math.floor(Number(s)));
    var noStockArr = noStock.map(s => Math.floor(Number(s)));
    if (inStockArr.includes(NaN) || noStockArr.includes(NaN)) {
      res.status(400);
      res.json({
        success: false
      });
      // TODO handle error
    } else {
      userManager.authenticateUser(key, (err, userId) => {
        if (err) throw err;
        if (userId != null) {
          db.sendReport(inStockArr, noStockArr, userId, storeId, timestamp, (err, success) => {
            if (err) throw err;
            res.json(success);
          });
        } else {
          res.status(400);
          res.json({
            success: false,
            error: 'Invalid API key!'
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
      success: false
    });
    // TODO handle error
  }
  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      res.status(400);
      res.json({
        success: false
      });
      // TODO handle error
    }
    userManager.createUser(name, email, hash, (err, status) => {
      if (err) throw err;
      if (status.success === false) res.status(400);
      res.json(status);
    });
  });
});

app.post('/api/login', (req, res) => {
  var email = String(req.body.email);
  var password = String(req.body.password);
  var stayLoggedIn = Boolean(req.body.stay_logged_in);

  if (email.length > 60 || password.length > 60) {
    res.status(400);
    res.json({
      success: false
    });
    // TODO handle error
  }

  userManager.login(email, password, stayLoggedIn, bcrypt, (err, response) => {
    if (err) throw err;
    res.json(response);
  });
});

app.post('/api/logout', (req, res) => {
  var key = String(req.body.key);

  userManager.logout(key, (err, response) => {
    if (err) throw err;
    if (response.success === false) res.status(400);
    res.json(response);
  });
});

app.post('/api/get_expire_time', (req, res) => {
  var key = String(req.body.key);

  userManager.getExpireTime(key, (err, response) => {
    if (err) throw err;
    if (response.success === false) res.status(400);
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
    res.send(failureTemplate.replace('{{error_msg}}', 'Invalid Recaptcha response!'));
  } else {
    bcrypt.hash(password, saltRounds, function (err, hash) {
      if (err) {
        res.status(400);
        res.json({
          success: false
        });
        // TODO handle error
      }
      userManager.changePassword(email, hash, token, (err, response) => {
        if (err) throw err;
        if (response.success) {
          res.set('Content-Type', 'text/html');
          res.set('Content-Type', 'text/html');
          res.send(successTemplate);
        } else {
          res.status(400);
          res.set('Content-Type', 'text/html');
          res.set('Content-Type', 'text/html');
          res.send(failureTemplate.replace('{{error_msg}}', response.error));
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
    res.send(failureTemplate.replace('{{error_msg}}', 'Invalid Recaptcha response!'));
  } else {
    userManager.passwordResetEmail(email, (err, response) => {
      if (err) throw err;
      if (response.success) {
        res.set('Content-Type', 'text/html');
        res.send(successTemplate);
      } else {
        res.status(400);
        res.set('Content-Type', 'text/html');
        res.send(failureTemplate.replace('{{error_msg}}', response.error));
      }
    });
  }
});

app.post('/api/resend_verification_email', recaptcha.middleware.verify, (req, res) => {
  var email = req.body.email;

  if (req.recaptcha.error) {
    res.status(400);
    res.set('Content-Type', 'text/html');
    res.send(failureTemplate.replace('{{error_msg}}', 'Invalid Recaptcha response!'));
  } else {
    userManager.resendVerificationEmail(email, (err, response) => {
      if (err) throw err;
      if (response.success) {
        res.set('Content-Type', 'text/html');
        res.send(successTemplate);
      } else {
        res.status(400);
        res.set('Content-Type', 'text/html');
        res.send(failureTemplate.replace('{{error_msg}}', response.error));
      }
    });
  }
});

app.get('/api/verify_email', (req, res) => {
  var email = req.query.email;
  var token = req.query.token;

  userManager.verifyUser(email, token, (err, response) => {
    if (err) throw err;
    if (response.success) {
      res.set('Content-Type', 'text/html');
      res.send(successTemplate);
    } else {
      res.status(400);
      res.set('Content-Type', 'text/html');
      res.send(failureTemplate.replace('{{error_msg}}', response.error));
    }
  });
});

app.get('/api/get_items', (req, res) => {
  var key = req.query.key;

  userManager.authenticateUser(key, (err, userId) => {
    if (err) throw err;
    if (userId != null) {
      db.getAllItems((err, items) => {
        if (err) throw err;
        db.getAllItemCategories((err, itemCategories) => {
          if (err) throw err;
          res.json({
            items: items,
            item_categories: itemCategories,
            success: true
          });
        });
      });
    } else {
      res.status(400);
      res.json({
        success: false,
        error: 'Invalid API key!'
      });
    }
  });
});

app.get('/api/get_stores_in_area', (req, res) => {
  var lat1 = Number(req.query.lat_1);
  var long1 = Number(req.query.long_1);
  var lat2 = Number(req.query.lat_2);
  var long2 = Number(req.query.long_2);
  var key = req.query.key;

  userManager.authenticateUser(key, (err, userId) => {
    if (err) throw err;
    if (userId != null) {
      if ([lat1, long1, lat2, long2].includes(undefined)) {
        res.status(400);
        res.json({
          success: false
        });
        // TODO handle error
      } else if ([lat1, long1, lat2, long2].includes(NaN)) {
        res.status(400);
        res.json({
          success: false
        });
        // TODO handle error
      } else {
        db.getStoresInArea(lat1, lat2, long1, long2, (err, stores) => {
          if (err) throw err;
          res.json({
            stores: stores,
            success: true
          });
        });
      }
    } else {
      res.status(400);
      res.json({
        success: false,
        error: 'Invalid API key!'
      });
    }
  });
});

app.get('/api/test', (req, res) => {
  // reliability_calc.get_reliability(db, 0, (reliability) => {
  // res.status(400);
  // res.json(reliability);
  // });
});

app.listen(port, () => console.log(`API listening on port ${port}!`));
