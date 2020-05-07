const mysql = require('mysql');
const crypto = require('crypto');
const secret = require('../secret.json');

const mailgun = require("mailgun-js");
const mg = mailgun({apiKey: secret['mailjet_api_key'], domain: 'shopstock.live'});

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
        console.log("User manager connected to SQL db!");
    });
};

exports.create_user = (name, email, password_hash, callback) => {
    var sql = 'INSERT INTO users (name, email, password, reliability, api_key, verified, token) VALUES (?, ?, ?, 0.0, ?, FALSE, ?)';
    gen_unique_key((key) => {
        gen_unique_token((token) => {
            is_email_in_use(email, (in_use) => {
                if(in_use == false) {
                    con.query(sql, [name, email, password_hash, key, token], (err, result) => {
                        if(err) throw err;
                        send_verification_email(name, email, token, callback);
                    });
                } else {
                    callback({'success': false, 'error': 'The email you specified is already in in use!'});
                }
            });
        }, 0);
    }, 0);
};

exports.verify_user = (email, token, callback) => {
    var sql = 'UPDATE users SET verified = TRUE WHERE email = ?';
    is_account_verified(email, (is_verified) => {
        if(is_verified) {
            callback({'success': false, 'error': 'This email is already verified!'});
        } else {
            get_token(email, (db_token) => {
                if(db_token == null) {
                    callback({'success': false, 'error': 'This email is not in use!'});
                } else {
                    if(db_token == token) {
                        con.query(sql, [email], (err, result) => {
                            if(err) throw err;
                            callback({'success': true});
                        });         
                    } else {
                        callback({'success': false, 'error': 'Invalid token!'});
                    }
                }
            });
        }
    });
};


exports.resend_verification_email = (email, callback) => {
    var sql = 'SELECT UNIX_TIMESTAMP(last_email) FROM users WHERE email = ?';
    con.query(sql, [email], (err, result) => {
        if(result.length == 0) {
            callback({'success': false, 'error': 'That email is not in use!'});
        } else {
            if (result[0]['UNIX_TIMESTAMP(last_email)'] + 3600 < new Date() / 1000) { // if last email sent more than an hour ago
                is_account_verified(email, (is_verified) => {
                    if(is_verified) {
                        callback({'success': false, 'error': 'That email is already verified!'});
                    } else {
                        get_name(email, (name) => {
                            get_token(email, (token) => {
                                send_verification_email(name, email, token, callback);
                            });
                        });
                    }
                });
            } else {
                callback({'success': false, 'error': 'You can only resend one verification email per hour!'});
            }
        }
    });
};

// helper functions

function send_verification_email(name, email, token, callback) {
    var sql = 'UPDATE users SET last_email = current_timestamp() WHERE email = ?';

    const verify_url_string = "http://devel.shopstock.live:3001/api/verify_email?email=" + email + "&token=" + token;

    const message_text = `You are recieving this email because you created a Shopstock account.
    Please confirm your email address by clicking the link below. If you did not create a Shopstock account, ignore this email.
    We may need to send you information about our service and it is important that we have an accurate email address. We must also verify your email to prevent abuse of our service.\n
    ` + verify_url_string + '\n';

    const email_data = {
        from: "Shopstock <no-reply@shopstock.live>",
        to: name + ' <' + email + '>',
        subject: "Verify your email for Shopstock",
        template: "confirm_email",
        text: message_text,
        'v:verify_url': verify_url_string
    };

    con.query(sql, [email], (err, result) => {
        if(err) throw err;
        mg.messages().send(email_data, function (err, body) {
            if(err) throw err
            callback({'success': true});
        });
    });
}

function is_account_verified(email, callback) {
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

function is_email_in_use(email, callback) {
    var sql = 'SELECT email FROM users WHERE email = ?';
    con.query(sql, [email], (err, result) => {
        if(result.length == 0) {
            callback(false);
        } else {
            callback(true);
        }
    });
}


function get_name(email, callback) {
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

function get_token(email, callback) {
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

function gen_unique_key(callback, depth) {
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
            gen_unique_key(callback, depth + 1);
        }
    });
}

function gen_unique_token(callback, depth) {
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
            gen_unique_key(callback, depth + 1);
        }
    });
}