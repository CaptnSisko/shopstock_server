exports.get_reliability = (db, userId, callback) => {
  db.get_user_reports(userId, (reports) => {
    for (var i = 0; i < reports.length - 1; i++) {

    }
    callback(reports);
  });
};
