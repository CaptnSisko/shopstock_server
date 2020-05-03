exports.get_reliability = (db, user_id, callback) => {
    db.get_user_reports(user_id, (reports) => {
        for(var i = 0; i < reports.length - 1; i++) {

        }
        callback(reports)
    });
}