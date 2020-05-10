const timeWeight = 0.65;

exports.getLabelling = (db, userManager, storeId, callback) => {
  const secondsSinceEpoch = Date.now() / 1000;
  var labellings = {};

  db.getStoreReports(storeId, (err, reports) => {
    if (!err && reports != null) {
      var users = [];
      for (var i in reports) {
        if (!users.includes(reports[i].userId)) {
          users.push(reports[i].userId);
        }
      }

      if (users.length === 0) {
        callback(err, []);
        return;
      }

      userManager.getReliabilities(users, (err, result) => {
        if (err || result.length !== users.length) {
          callback(err, null);
        } else {
          // User dictionary of reliabilities
          const userDict = result;
          console.log(reports);

          // Iterate over the sorted reports
          var confidenceSums = {};
          var confidenceNumbers = {};
          for (var f in reports) {
            var stockStatus = -1;
            if (reports[f].inStock === 1) {
              stockStatus = 1;
            }

            const step = calculateConfidence(reports[f], secondsSinceEpoch, userDict[reports[f].userId]) * stockStatus;
            console.log(step);
            if (confidenceSums[reports[f].itemId] === undefined) {
              confidenceSums[reports[f].itemId] = step;
              confidenceNumbers[reports[f].itemId] = 1;
            } else {
              confidenceSums[reports[f].itemId] += step;
              confidenceNumbers[reports[f].itemId] += 1;
            }
          }
          for (var key in confidenceSums) {
            labellings[key] = confidenceSums[key] / confidenceNumbers[key];
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
  console.log('calculateConfidence method called');
  const deltaT = (currentEpochSecs - report.timestamp) / 60;

  // Confidence function calculation
  const timeComponent = timeWeight * (150 / (150 + Math.exp(deltaT)));
  const userComponent = (1 - timeWeight) * Math.tanh(1.5 * reliability + 0.42);
  const confidence = timeComponent + userComponent;

  if (confidence < 0) { return 0; }
  return confidence;
}
