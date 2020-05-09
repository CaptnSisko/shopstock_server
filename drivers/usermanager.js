const crypto = require('crypto');
const secret = require('../secret.json');

const mailgun = require('mailgun-js');
const mg = mailgun({ apiKey: secret.mailjet_api_key, domain: 'shopstock.live' });

const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var db;

exports.setup = (database) => {
  db = database;
};

exports.authenticate_user = (key, callback) => {
  authenticateUser(key, (err, userId) => {
    callback(err, userId);
  });
};

exports.login = (email, password, stayLoggedIn, bcrypt, callback) => {
  var sql = 'SELECT password FROM users WHERE email = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    con.query(sql, [email], (err, result) => {
      // if (err) throw err;

      if (result.length === 0) {
        callback(err, { success: false, error: 'Invalid username/password!' });
      } else {
        bcrypt.compare(password, result[0].password, function (err, matched) {
          // if (err) throw err;

          if (matched) {
            isAccountVerified(email, con, (err, isVerified) => {
              if (isVerified) {
                // must run this before refreshing key expirey to check if old key is expired
                getKeyIfNotExpired(email, con, (err, key) => {
                  if (err) throw err;
                  if (key == null) { // if key is expired, generate a new one, then refresh expirey and return it
                    refreshKey(email, con, (err, newKey) => {
                      if (err) throw err;
                      refreshKeyExpirey(email, stayLoggedIn, con, (err) => {
                        callback(err, { success: true, key: newKey });
                      });
                    });
                  } else { // otherwise, just return the key and refresh expirey
                    refreshKeyExpirey(email, stayLoggedIn, con, (err) => {
                      callback(err, { success: true, key: key });
                    });
                  }
                });
              } else {
                callback(err, { success: false, error: 'This account\'s email is not verified!' });
              }
            });
          } else {
            callback(err, { success: false, error: 'Invalid username/password!' });
          }
        });
      }
    });
  });
};

exports.logout = (key, callback) => {
  var sql = 'UPDATE users SET expire_time = 0 WHERE api_key = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    authenticateUser(key, (err, userId) => {
      if (userId == null) {
        callback(err, { success: false, error: 'Invalid API key!' });
      } else {
        con.query(sql, [key], (err, result) => {
          callback(err, { success: true });
        });
      }
    });
  });
};

exports.get_expire_time = (key, callback) => {
  var sql = 'SELECT UNIX_TIMESTAMP(expire_time) FROM users WHERE api_key = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    authenticateUser(key, (err, userId) => {
      if (userId == null) {
        callback(err, { success: false, error: 'Invalid API key!' });
      } else {
        con.query(sql, [key], (err, result) => {
          callback(err, { success: true, expires: result[0]['UNIX_TIMESTAMP(expire_time)'] });
        });
      }
    });
  });
};

exports.create_user = (name, email, passwordHash, callback) => {
  var sql = 'INSERT INTO users (name, email, password, reliability, api_key, verified, token) VALUES (?, ?, ?, 0.0, ?, FALSE, ?)';

  db.get_connection((err, con) => {
    if (err) throw err;
    genUniqueKey(con, (err, key) => {
      if (err) throw err;
      genUniqueToken(con, (err, token) => {
        if (err) throw err;
        isEmailInUse(email, con, (err, inUse) => {
          if (inUse === false) {
            sendVerificationEmail(name, email, token, con, (err, result) => {
              if (result.success) {
                con.query(sql, [name, email, passwordHash, key, token], (err, result) => {
                  callback(err, result);
                });
              } else {
                callback(err, result);
              }
            });
          } else {
            callback(err, { success: false, error: 'The email you specified is already in in use!' });
          }
        });
      }, 0);
    }, 0);
  });
};

exports.verify_user = (email, token, callback) => {
  var sql = 'UPDATE users SET verified = TRUE WHERE email = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    isAccountVerified(email, con, (err, isVerified) => {
      if (isVerified) {
        callback(err, { success: false, error: 'This email is already verified!' });
      } else {
        getToken(email, con, (err, dbToken) => {
          if (dbToken == null) {
            callback(err, { success: false, error: 'This email is not in use!' });
          } else {
            if (dbToken === token) {
              // refresh the token then verify account
              refreshToken(email, con, (err) => {
                if (err) throw err;
                con.query(sql, [email], (err, result) => {
                  callback(err, { success: true });
                });
              });
            } else {
              callback(err, { success: false, error: 'Invalid token!' });
            }
          }
        });
      }
    });
  });
};

exports.change_password = (email, password, token, callback) => {
  var sql = 'UPDATE users SET password = ? WHERE email = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    getToken(email, con, (err, dbToken) => {
      if (dbToken == null) { // this should never happen
        callback(err, { success: false, error: 'This email is not in use!' });
      } else if (token !== dbToken) {
        callback(err, { success: false, error: 'Invalid token!' });
      } else {
        isAccountVerified(email, con, (err, isVerified) => {
          if (!isVerified) {
            callback(err, { success: false, error: 'You must verify your email before changing your password!' });
          } else {
            // refresh token and update password
            refreshToken(email, con, (err) => {
              if (err) throw err;
              con.query(sql, [password, email], (err, result) => {
                callback(err, { success: true });
              });
            });
          }
        });
      }
    });
  });
};

exports.resend_verification_email = (email, callback) => {
  var sql = 'SELECT UNIX_TIMESTAMP(last_email) FROM users WHERE email = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    con.query(sql, [email], (err, result) => {
      if (result.length === 0) {
        callback(err, { success: false, error: 'That email is not in use!' });
      } else {
        if (result[0]['UNIX_TIMESTAMP(last_email)'] + 3600 < new Date() / 1000) { // if last email sent more than an hour ago
          isAccountVerified(email, con, (err, isVerified) => {
            if (isVerified) {
              callback(err, { success: false, error: 'That email is already verified!' });
            } else {
              getName(email, con, (err, name) => {
                if (err) throw err;
                getToken(email, con, (err, token) => {
                  if (err) throw err;
                  sendVerificationEmail(name, email, token, con, callback);
                });
              });
            }
          });
        } else {
          callback(err, { success: false, error: 'You can only send one verification email per hour!' });
        }
      }
    });
  });
};

exports.password_reset_email = (email, callback) => {
  var sql = 'SELECT UNIX_TIMESTAMP(last_email) FROM users WHERE email = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    con.query(sql, [email], (err, result) => {
      if (result.length === 0) {
        callback(err, { success: false, error: 'That email is not in use!' });
      } else {
        if (result[0]['UNIX_TIMESTAMP(last_email)'] + 3600 < new Date() / 1000) { // if last email sent more than an hour ago
          isAccountVerified(email, con, (err, isVerified) => {
            if (!isVerified) {
              callback(err, { success: false, error: 'You must verify your email before changing your password!' });
            } else {
              getName(email, con, (err, name) => {
                if (err) throw err;
                getToken(email, con, (err, token) => {
                  if (err) throw err;
                  sendPasswordEmail(name, email, token, con, callback);
                });
              });
            }
          });
        } else {
          callback(err, { success: false, error: 'You can only send one password reset email per hour!' });
        }
      }
    });
  });
};

// helper functions

function authenticateUser (key, callback) {
  var sql = 'SELECT id, UNIX_TIMESTAMP(expire_time) FROM users WHERE api_key = ?';

  db.get_connection((err, con) => {
    if (err) throw err;
    con.query(sql, [key], (err, result) => {
      if (result.length === 0 || result[0]['UNIX_TIMESTAMP(expire_time)'] < new Date() / 1000) { // return null for nonexistant or expired key
        callback(err, null);
      } else {
        callback(err, result[0].id);
      }
    });
  });
}

function sendVerificationEmail (name, email, token, con, callback) {
  var sql = 'UPDATE users SET last_email = current_timestamp() WHERE email = ?';

  const verifyUrlString = secret.base_url + '/api/verify_email?email=' + email + '&token=' + token;

  const messageText = 'Hello ' + name + `,\n
    You are recieving this email because you created a Shopstock account.
    Please confirm your email address by opening the link below. If you did not create a Shopstock account, ignore this email.
    We may need to send you information about our service and it is important that we have an accurate email address.
    We must also verify your email to prevent abuse of our service.\n
    ` + verifyUrlString + '\n';

  const emailData = {
    from: 'Shopstock <no-reply@shopstock.live>',
    to: name + ' <' + email + '>',
    subject: 'Verify your email for Shopstock',
    text: messageText,
    template: 'confirm_email',
    'v:name': name,
    'v:verify_url': verifyUrlString
  };

  // check email with regex
  if (!re.test(String(email).toLowerCase())) {
    callback(undefined, { success: false, error: 'Invalid email!' });
  } else {
    con.query(sql, [email], (err, result) => {
      if (err) throw err;
      mg.messages().send(emailData, function (err, body) {
        if (err) {
          callback(err, { success: false, error: 'Invalid email!' });
        } else {
          callback(err, { success: true });
        }
      });
    });
  }
}

function sendPasswordEmail (name, email, token, con, callback) {
  var sql = 'UPDATE users SET last_email = current_timestamp() WHERE email = ?';

  const passwordUrlString = secret.base_url + '/reset_password/set_new_password/?email=' + email + '&token=' + token;

  const messageText = 'Hello ' + name + `,\n
    You are recieving this email because you requested to reset your Shopstock password.
    Open the link below to enter a new password.
    If you did not request a password reset, you may safely ignore this email.\n
    ` + passwordUrlString + '\n';

  const emailData = {
    from: 'Shopstock <no-reply@shopstock.live>',
    to: name + ' <' + email + '>',
    subject: 'Reset your password for Shopstock',
    text: messageText,
    template: 'reset_password',
    'v:name': name,
    'v:reset_url': passwordUrlString
  };

  // check email with regex
  if (!re.test(String(email).toLowerCase())) {
    callback(undefined, { success: false, error: 'Invalid email!' });
  } else {
    con.query(sql, [email], (err, result) => {
      if (err) throw err;
      mg.messages().send(emailData, function (err, body) {
        if (err) {
          callback(err, { success: false, error: 'Invalid email!' });
        } else {
          callback(err, { success: true });
        }
      });
    });
  }
}

function isAccountVerified (email, con, callback) {
  var sql = 'SELECT verified FROM users WHERE email = ?';
  con.query(sql, [email], (err, result) => {
    if (result.length === 0) {
      callback(err, false);
    } else {
      callback(err, result[0].verified);
    }
  });
}

function isEmailInUse (email, con, callback) {
  var sql = 'SELECT email FROM users WHERE email = ?';
  con.query(sql, [email], (err, result) => {
    if (result.length === 0) {
      callback(err, false);
    } else {
      callback(err, true);
    }
  });
}

function getName (email, con, callback) {
  var sql = 'SELECT name FROM users WHERE email = ?';
  con.query(sql, [email], (err, result) => {
    if (result.length === 0) {
      callback(err, null);
    } else {
      callback(err, result[0].name);
    }
  });
}

function getToken (email, con, callback) {
  var sql = 'SELECT token FROM users WHERE email = ?';
  con.query(sql, [email], (err, result) => {
    if (result.length === 0) {
      callback(err, null);
    } else {
      callback(err, result[0].token);
    }
  });
}

function genUniqueKey (con, callback, depth) {
  if (depth > 10) { // in case of some sort of error don't keep going forever
    return;
  }
  var sql = 'SELECT api_key FROM users WHERE api_key = ?';
  var key = crypto.randomBytes(32).toString('hex');
  con.query(sql, [key], (err, result) => {
    if (result.length === 0) {
      callback(err, key);
    } else {
      genUniqueKey(con, callback, depth + 1);
    }
  });
}

function genUniqueToken (con, callback, depth) {
  if (depth > 10) { // in case of some sort of error don't keep going forever
    return;
  }
  var sql = 'SELECT token FROM users WHERE token = ?';
  var token = crypto.randomBytes(32).toString('hex');
  con.query(sql, [token], (err, result) => {
    if (result.length === 0) {
      callback(err, token);
    } else {
      genUniqueToken(con, callback, depth + 1);
    }
  });
}

function refreshKey (email, con, callback) {
  var sql = 'UPDATE users SET api_key = ? WHERE email = ?';

  genUniqueKey(con, (err, key) => {
    if (err) throw err;
    con.query(sql, [key, email], (err, result) => {
      callback(err, key);
    });
  });
}

function refreshToken (email, con, callback) {
  var sql = 'UPDATE users SET token = ? WHERE email = ?';

  genUniqueToken(con, (err, token) => {
    if (err) throw err;
    con.query(sql, [token, email], (err, result) => {
      callback(err);
    });
  });
}

function getKeyIfNotExpired (email, con, callback) {
  var sql = 'SELECT UNIX_TIMESTAMP(expire_time), api_key FROM users WHERE email = ?';

  con.query(sql, [email], (err, result) => {
    if (result.length === 0) {
      callback(err, null);
    } else if (result[0]['UNIX_TIMESTAMP(expire_time)'] > new Date() / 1000) { // if key is NOT expired
      callback(err, result[0].api_key);
    } else {
      callback(err, null);
    }
  });
}

function refreshKeyExpirey (email, stayLoggedIn, con, callback) {
  var sql = 'UPDATE users SET expire_time = DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 DAY) WHERE email = ?;';
  if (stayLoggedIn) {
    sql = 'UPDATE users SET expire_time = DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 MONTH) WHERE email = ?;';
  }
  con.query(sql, [email], (err, result) => {
    callback(err);
  });
}
