"use strict";

var KMeans = require('../utils/knn');

var csv = require('csvtojson');

var _ = require('lodash');

var dayClasses = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var timeClasses = ['Morning', 'Afternoon'];

function run() {
  var csvFilePath, data, kmeans, res;
  return regeneratorRuntime.async(function run$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          csvFilePath = './csv/user_1.csv';
          _context.next = 3;
          return regeneratorRuntime.awrap(csv().fromFile(csvFilePath));

        case 3:
          data = _context.sent;
          kmeans = new KMeans(dayClasses, timeClasses, data);
          kmeans.train(); // console.log(kmeans.timeModel)

          res = kmeans.predict({
            purpose: 'work',
            participants: ['user_3']
          });
          console.error(res);
          csvFilePath = './csv/user_2.csv';
          _context.next = 11;
          return regeneratorRuntime.awrap(csv().fromFile(csvFilePath));

        case 11:
          data = _context.sent;
          kmeans = new KMeans(dayClasses, timeClasses, data);
          kmeans.train();
          res = kmeans.predict({
            purpose: 'work',
            participants: ['user_3', 'user_4']
          });
          console.error(res);

        case 16:
        case "end":
          return _context.stop();
      }
    }
  });
}

run();