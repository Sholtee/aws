'use strict';
exports.handler = function(event, context, callback) {
  try {
    return callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify('Hello World!')
    });
  } catch (err) {
    console.error(err);
    return callback(err);
  }
};