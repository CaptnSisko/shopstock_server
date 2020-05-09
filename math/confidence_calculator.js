const timeWeight = 0.65;

exports.get_labelling = (db, storeId, callback) => {
  const secondsSinceEpoch = Date.now() / 1000;
  const labellings = {};

  db.getStoreReports(storeId, (err, reports) => {
    if (!err && reports != null) {
      reports.sort(function (a, b) { return a.itemId - b.itemId; });

      var users = [];
      for (const report in reports) {
        if (!users.includes(report.userId)) {
          users.push(report.userId);
        }
      }

      db.getReliabilities(users, (err, result) => {
        if (err || result.length !== users.length) {
          callback(err, null);
        } else {
          // User dictionary of reliabilities
          const userDict = result;

          // Iterate over the sorted reports
          var currentItemId = reports[0].itemId;
          var currentItemReports = [];
          for (const report in reports) {
            if (report.itemId !== currentItemId) {
              // Calculate the labelling for the last item
              var sumAllConfidences = 0;
              for (const itemReport in currentItemReports) {
                sumAllConfidences += calculateConfidence(itemReport, secondsSinceEpoch, userDict[report.userId]);
              }

              var label = 0;
              for (const itemReport in currentItemReports) {
                const conf = calculateConfidence(itemReport, secondsSinceEpoch, userDict[report.userId]);
                label += (conf * itemReport.inStock) / sumAllConfidences;
              }

              // Adding the lable to object returned
              labellings.push({ id: currentItemId, labelling: label });

              // Resetting variables
              currentItemId = report.itemId;
              currentItemReports = [];
            }
            currentItemReports.push(report);
          }
          callback(err, labellings);
        }
      });
    } else {
      callback(err, null);
    }
  });
};

function calculateConfidence (report, currentEpochSecs, reliability) {
  const deltaT = (currentEpochSecs - report.timestamp) / 60;

  // Confidence function calculation
  const timeComponent = timeWeight * (150 / (150 + Math.exp(deltaT)));
  const userComponent = (1 - timeWeight) * Math.tanh(1.5 * reliability + 0.42);
  const confidence = timeComponent + userComponent;

  if (confidence < 0) { return 0; }
  return confidence;
}
