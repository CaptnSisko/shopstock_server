const crypto = require('crypto');
const secret = require('../secret.json');

const mailgun = require("mailgun-js");
const mg = mailgun({apiKey: secret['mailjet_api_key'], domain: 'shopstock.live'});

const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var db;

exports.setup = (database) => {
    db = database;
};

exports.authenticate_user = (key, callback) => {
    var sql = 'SELECT id, UNIX_TIMESTAMP(expire_time) FROM users WHERE api_key = ?';

    db.get_connection((con) => {
        con.query(sql, [key], (err, result) => {
            if(err) throw err;
            if (result.length == 0 || result[0]['UNIX_TIMESTAMP(expire_time)'] < new Date() / 1000) { // return null for nonexistant or expired key
                callback(null);
            } else {
                callback(result[0].id);
            }
        });
    });
};

exports.login = (email, password, stay_logged_in, bcrypt, callback) => {
    var sql = 'SELECT password FROM users WHERE email = ?';
    
    db.get_connection((con) => {
        con.query(sql, [email], (err, result) => {
            if(result.length == 0) {
                callback({'success': false, 'error': 'Invalid username/password!'});
            } else {
                bcrypt.compare(password, result[0].password, function(err, matched) {
                    if (err) throw err;

                    if(matched) {
                        is_account_verified(email, con, (is_verified) => {
                            if(is_verified) {
                                // must run this before refreshing key expirey to check if old key is expired
                                get_key_if_not_expired(email, con, (key) => {
                                    if(key == null) { // if key is expired, generate a new one, then refresh expirey and return it
                                        refresh_key(email, con, (new_key) => {
                                            refresh_key_expirey(email, stay_logged_in, con, () => {
                                                callback({'success': true, 'key': new_key});
                                            });
                                        });
                                    } else { // otherwise, just return the key and refresh expirey
                                        refresh_key_expirey(email, stay_logged_in, con, () => {
                                            callback({'success': true, 'key': key});
                                        });
                                    }
                                });
                            } else {
                                callback({'success': false, 'error': 'This account\'s email is not verified!'});
                            }
                        });
                    } else {
                        callback({'success': false, 'error': 'Invalid username/password!'});
                    }
                });
            }
        });
    });
};

exports.logout = (key, callback) => {
    var sql = 'UPDATE users SET expire_time = 0 WHERE api_key = ?';

    db.get_connection((con) => {
        this.authenticate_user(key, (user_id) => {
            if(user_id == null) {
                callback({'success': false, 'error': 'Invalid API key!'})
            } else {
                con.query(sql, [key], (err, result) => {
                    if(err) throw err;
                    callback({'success': true})
                });
            }
        });
    });
};

exports.get_expire_time = (key, callback) => {
    var sql = 'SELECT UNIX_TIMESTAMP(expire_time) FROM users WHERE api_key = ?';

    db.get_connection((con) => {
        this.authenticate_user(key, (user_id) => {
            if(user_id == null) {
                callback({'success': false, 'error': 'Invalid API key!'})
            } else {
                con.query(sql, [key], (err, result) => {
                    if(err) throw err;
                    callback({'success': true, 'expires': result[0]['UNIX_TIMESTAMP(expire_time)']});
                });
            }
        });
    });
};

exports.create_user = (name, email, password_hash, callback) => {
    var sql = 'INSERT INTO users (name, email, password, reliability, api_key, verified, token) VALUES (?, ?, ?, 0.0, ?, FALSE, ?)';

    db.get_connection((con) => {
        gen_unique_key(con, (key) => {
            gen_unique_token(con, (token) => {
                is_email_in_use(email, con, (in_use) => {
                    if(in_use == false) {
                        send_verification_email(name, email, token, con, (result) => {
                            if(result['success']) {
                                con.query(sql, [name, email, password_hash, key, token], (err, result) => {
                                    if(err) throw err;
                                    callback(result);
                                });
                            } else {
                                callback(result);
                            }
                        });
                    } else {
                        callback({'success': false, 'error': 'The email you specified is already in in use!'});
                    }
                });
            }, 0);
        }, 0);
    });
};

exports.verify_user = (email, token, callback) => {
    var sql = 'UPDATE users SET verified = TRUE WHERE email = ?';

    db.get_connection((con) => {
        is_account_verified(email, con, (is_verified) => {
            if(is_verified) {
                callback({'success': false, 'error': 'This email is already verified!'});
            } else {
                get_token(email, con, (db_token) => {
                    if(db_token == null) {
                        callback({'success': false, 'error': 'This email is not in use!'});
                    } else {
                        if(db_token == token) {
                            // refresh the token then verify account
                            refresh_token(email, con, () => {
                                con.query(sql, [email], (err, result) => {
                                    if(err) throw err;
                                    callback({'success': true});
                                });
                            });         
                        } else {
                            callback({'success': false, 'error': 'Invalid token!'});
                        }
                    }
                });
            }
        });
    });
};

exports.change_password = (email, password, token, callback) => {
    var sql = 'UPDATE users SET password = ? WHERE email = ?';

    db.get_connection((con) => {
        get_token(email, con, (db_token) => {
            if(db_token == null) { // this should never happen
                callback({'success': false, 'error': 'This email is not in use!'});
            } else if (token != db_token) {
                callback({'success': false, 'error': 'Invalid token!'});
            } else {
                is_account_verified(email, con, (is_verified) => {
                    if(!is_verified) {
                        callback({'success': false, 'error': 'You must verify your email before changing your password!'});
                    } else {

                        // refresh token and update password
                        refresh_token(email, con, () => {
                            con.query(sql, [password, email], (err, result) => {
                                if(err) throw err;
                                callback({'success': true});
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
    
    db.get_connection((con) => {
        con.query(sql, [email], (err, result) => {
            if(err) throw err;

            if(result.length == 0) {
                callback({'success': false, 'error': 'That email is not in use!'});
            } else {
                if (result[0]['UNIX_TIMESTAMP(last_email)'] + 3600 < new Date() / 1000) { // if last email sent more than an hour ago
                    is_account_verified(email, con, (is_verified) => {
                     if(is_verified) {
                            callback({'success': false, 'error': 'That email is already verified!'});
                        } else {
                            get_name(email, con, (name) => {
                                get_token(email, con, (token) => {
                                    send_verification_email(name, email, token, con, callback);
                                });
                            });
                        }
                    });
                } else {
                    callback({'success': false, 'error': 'You can only send one verification email per hour!'});
                }
            }
        });
    });
};

exports.password_reset_email = (email, callback) => {
    var sql = 'SELECT UNIX_TIMESTAMP(last_email) FROM users WHERE email = ?';
    
    db.get_connection((con) => {
        con.query(sql, [email], (err, result) => {
            if(result.length == 0) {
                callback({'success': false, 'error': 'That email is not in use!'});
            } else {
                if (result[0]['UNIX_TIMESTAMP(last_email)'] + 3600 < new Date() / 1000) { // if last email sent more than an hour ago
                    is_account_verified(email, con, (is_verified) => {
                        if(!is_verified) {
                            callback({'success': false, 'error': 'You must verify your email before changing your password!'});
                        } else {
                            get_name(email, con, (name) => {
                                get_token(email, con, (token) => {
                                    send_password_email(name, email, token, con, callback);
                                });
                            });
                        }
                    });
                } else {
                    callback({'success': false, 'error': 'You can only send one password reset email per hour!'});
                }
            }
        });
    });
};


// helper functions

function send_verification_email(name, email, token, con, callback) {
    var sql = 'UPDATE users SET last_email = current_timestamp() WHERE email = ?';

    const verify_url_string = secret['base_url'] + "/api/verify_email?email=" + email + "&token=" + token;

    const message_text = `Hello ` + name + `,\n
    You are recieving this email because you created a Shopstock account.
    Please confirm your email address by opening the link below. If you did not create a Shopstock account, ignore this email.
    We may need to send you information about our service and it is important that we have an accurate email address.
    We must also verify your email to prevent abuse of our service.\n
    ` + verify_url_string + '\n';

    const email_data = {
        from: "Shopstock <no-reply@shopstock.live>",
        to: name + ' <' + email + '>',
        subject: "Verify your email for Shopstock",
        text: message_text,
        template: "confirm_email",
        'v:name': name,
        'v:verify_url': verify_url_string
    };

    // check email with regex
    if(!re.test(String(email).toLowerCase())) {
        callback({'success': false, 'error': 'Invalid email!'});
    } else {
        con.query(sql, [email], (err, result) => {
            if(err) throw err;
            mg.messages().send(email_data, function (err, body) {
                if(err) {
                    callback({'success': false, 'error': 'Invalid email!'});
                } else {
                    callback({'success': true});
                }
            });
        });
    }
}

function send_password_email(name, email, token, con, callback) {
    var sql = 'UPDATE users SET last_email = current_timestamp() WHERE email = ?';

    const password_url_string = secret['base_url'] + "/reset_password/set_new_password/?email=" + email + "&token=" + token;

    const message_text = `Hello ` + name + `,\n
    You are recieving this email because you requested to reset your Shopstock password.
    Open the link below to enter a new password.
    If you did not request a password reset, you may safely ignore this email.\n
    ` + password_url_string + '\n';

    const email_data = {
        from: "Shopstock <no-reply@shopstock.live>",
        to: name + ' <' + email + '>',
        subject: "Reset your password for Shopstock",
        text: message_text,
        template: "reset_password",
        'v:name': name,
        'v:reset_url': password_url_string
    };

    // check email with regex
    if(!re.test(String(email).toLowerCase())) {
        callback({'success': false, 'error': 'Invalid email!'});
    } else {
        con.query(sql, [email], (err, result) => {
            if(err) throw err;
            mg.messages().send(email_data, function (err, body) {
                if(err) {
                    callback({'success': false, 'error': 'Invalid email!'});
                } else {
                    callback({'success': true});
                }
            });
        });
    }
}

function is_account_verified(email, con, callback) {
    var sql = 'SELECT verified FROM users WHERE email = ?';
    con.query(sql, [email], (err, result) => {
        if(err) throw err;
        if(result.length == 0) {
            callback(false);
        } else {
            callback(result[0].verified);
        }
    });
}

function is_email_in_use(email, con, callback) {
    var sql = 'SELECT email FROM users WHERE email = ?';
    con.query(sql, [email], (err, result) => {
        if(result.length == 0) {
            callback(false);
        } else {
            callback(true);
        }
    });
}


function get_name(email, con, callback) {
    var sql = 'SELECT name FROM users WHERE email = ?';
    con.query(sql, [email], (err, result) => {
        if (err) throw err;
        if(result.length == 0) {
            callback(null);
        } else {
            callback(result[0].name);
        }
    });
}

function get_token(email, con, callback) {
    var sql = 'SELECT token FROM users WHERE email = ?';
    con.query(sql, [email], (err, result) => {
        if (err) throw err;
        if(result.length == 0) {
            callback(null);
        } else {
            callback(result[0].token);
        }
    });
}

function gen_unique_key(con, callback, depth) {
    if(depth > 10) { // in case of some sort of error don't keep going forever
        return;
    }
    var sql = 'SELECT api_key FROM users WHERE api_key = ?';
    var key = crypto.randomBytes(32).toString('hex');
    con.query(sql, [key], (err, result) => {
        if (err) throw err;
        if(result.length == 0) {
            callback(key);
        } else {
            gen_unique_key(con, callback, depth + 1);
        }
    });
}

function gen_unique_token(con, callback, depth) {
    if(depth > 10) { // in case of some sort of error don't keep going forever
        return;
    }
    var sql = 'SELECT token FROM users WHERE token = ?';
    var token = crypto.randomBytes(32).toString('hex');
    con.query(sql, [token], (err, result) => {
        if (err) throw err;
        if(result.length == 0) {
            callback(token);
        } else {
            gen_unique_token(con, callback, depth + 1);
        }
    });
}

function refresh_key(email, con, callback) {
    var sql = 'UPDATE users SET api_key = ? WHERE email = ?';

    gen_unique_key(con, (key) => {
        con.query(sql, [key, email], (err, result) => {
            if (err) throw err;
            callback(key);
        });
    });
}

function refresh_token(email, con, callback) {
    var sql = 'UPDATE users SET token = ? WHERE email = ?';

    gen_unique_token(con, (token) => {
        con.query(sql, [token, email], (err, result) => {
            if (err) throw err;
            callback();
        });
    });
}

function get_key_if_not_expired(email, con, callback) {
    var sql = 'SELECT UNIX_TIMESTAMP(expire_time), api_key FROM users WHERE email = ?';

    con.query(sql, [email], (err, result) => {
        if(result.length == 0) {
            callback(null);
        } else if (result[0]['UNIX_TIMESTAMP(expire_time)'] > new Date() / 1000) { // if key is NOT expired
            callback(result[0].api_key);
        } else {
            callback(null);
        }
    });

}

function refresh_key_expirey(email, stay_logged_in, con, callback) {
    var sql = 'UPDATE users SET expire_time = DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 DAY) WHERE email = ?;';
    if(stay_logged_in) {
        sql = 'UPDATE users SET expire_time = DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 MONTH) WHERE email = ?;';
    }
    con.query(sql, [email], (err, result) => {
        if (err) throw err;
        callback();
    });
}
