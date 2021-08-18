"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var csv = require('csvtojson');

var _ = require('lodash');

var purposes = ['social', 'chat', 'work', 'normal'];

function getPurpose(description) {
  if (!description) return 'normal';
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = purposes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var purpose = _step.value;
      if (description.includes(purpose)) return purpose;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return 'normal';
}
/**
 * Learn from history.
 * If meeting Coordinator (MC) previously had meeting with any of the participants,
 * follow the pattern.
 * 
 * If MC previously has not yet met with any of the participants before, 
 * predict based on meeting type
 */


var KMeans =
/*#__PURE__*/
function () {
  function KMeans(_dayCentroids, _timeCentroids, _points) {
    _classCallCheck(this, KMeans);

    this.dayCentroids = _dayCentroids;
    this.timeCentroids = _timeCentroids;
    this.points = _points;
    this.dayModel = {};
    this.timeModel = {};
  }

  _createClass(KMeans, [{
    key: "getTime",
    value: function getTime(date) {
      return this.timeCentroids[date.getHours() - 12 >= 0 ? 1 : 0];
    }
  }, {
    key: "train",
    value: function train() {
      var _this = this;

      var points = this.points,
          dayCentroids = this.dayCentroids,
          dayModel = this.dayModel,
          timeCentroids = this.timeCentroids,
          timeModel = this.timeModel; // supervised learning, give each data point a symbol

      points.forEach(function (point, index) {
        var start = new Date(point.start.dateTime),
            end = new Date(point.end.dateTime);

        if (start.getDay() !== end.getDay()) {
          console.error('Does not support meeting scheduled across two days');
          return;
        }

        var attendees = [];

        if (!point.attendees instanceof Object) {
          attendees = JSON.parse(point.attendees);
        } else {
          attendees = point.attendees;
        }

        points[index] = _objectSpread({}, point, {
          purpose: getPurpose(point.description),
          dayClass: dayCentroids[start.getDay()],
          timeClass: _this.getTime(start),
          participants: (attendees || []).map(function (el) {
            return el.email;
          })
        });
      });
      dayCentroids.forEach(function (centroid) {
        dayModel[centroid] = [];
      });
      timeCentroids.forEach(function (centroid) {
        timeModel[centroid] = [];
      });
      points.forEach(function (point) {
        var featureClasses = [dayModel[point.dayClass], timeModel[point.timeClass]];
        featureClasses.forEach(function (featureClass) {
          point.participants.forEach(function (participant) {
            var flag = false;
            featureClass.forEach(function (el) {
              if (point.purpose === el.purpose && el.participantName === participant) {
                el.count += 1;
                flag = true;
              }
            });

            if (!flag) {
              featureClass.push({
                participantName: participant,
                description: point.description,
                purpose: point.purpose,
                count: 1
              });
            }
          });
        });
      });
    } // predict by compromised parameters
    // if have met with the same guy doing the same thing, decrease the distance by the counter
    // if met with the same guy doing other things or doing the same thing with other guys, decrease the distance by half of counter

  }, {
    key: "predict",
    value: function predict(dataPoint) {
      var dayModel = this.dayModel,
          timeModel = this.timeModel; // daySymbolDistance, timeSymbolDistance

      var distances = [{}, {}];
      [dayModel, timeModel].forEach(function (model, index) {
        Object.keys(model).forEach(function (symbol) {
          var distance = 0;
          var filteredByDesc = model[symbol].filter(function (el) {
            return el.purpose === dataPoint.purpose;
          });
          filteredByDesc.forEach(function (participantWithCounter) {
            if (dataPoint.participants.includes(participantWithCounter.participantName)) {
              distance -= participantWithCounter.count;
            }
          });
          distances[index][symbol] = distance;
        });
      });
      var sum = Object.values(distances[0]).reduce(function (pre, cur) {
        return pre + cur;
      }, 0); // if no match with the guy and purpose, compromise

      if (sum === 0) {
        Object.keys(dayModel).forEach(function (symbol) {
          var distance = 0;
          var filteredByDesc = dayModel[symbol].filter(function (el) {
            return el.purpose === dataPoint.purpose;
          });
          distance -= filteredByDesc.length;
          dayModel[symbol].forEach(function (participantWithCounter) {
            if (dataPoint.participants.includes(participantWithCounter.participantName)) {
              distance -= participantWithCounter.count;
            }
          });
          distances[0][symbol] = distance;
        });
      }

      return {
        day: distances[0],
        time: distances[1]
      };
    }
  }]);

  return KMeans;
}();

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
          kmeans.train();
          res = kmeans.predict({
            description: 'social',
            participants: ['user_1', 'user_2']
          });
          console.error(res);

        case 8:
        case "end":
          return _context.stop();
      }
    }
  });
}

module.exports = KMeans;
var model = {
  'Monday': [{
    count: 1,
    participantName: "Tom",
    purpose: "social"
  }, {
    count: 1,
    participantName: "Tom",
    purpose: "work"
  }, {
    count: 1,
    participantName: "Bob",
    purpose: "social"
  }],
  'Tuesday': [{
    count: 1,
    participantName: "Tom",
    purpose: "chat"
  }]
};