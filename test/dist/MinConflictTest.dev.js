"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

// test vs number of conflicts payload
var MinConflict = require('../utils/min'); // const csvFilePath = "./csv/user_1.csv"
// const csv = require('csvtojson');
// csv().fromFile(csvFilePath)
//   .then((jsonObj) => {
//     console.log(jsonObj);
//   })


var sT = '2021-05-10T18:00:00.00-07:00';
var eT = '2021-05-11T17:00:00.00-07:00';
var time = {
  meeting_start_time: new Date(sT),
  //9:00
  meeting_end_time: new Date(eT) //15:00

};
var payloads = [];

for (var _i = 0, _arr = [100, 200, 400, 800]; _i < _arr.length; _i++) {
  var size = _arr[_i];
  var start = new Date(sT);
  var end = new Date(eT);
  var interval = (end.getTime() - start.getTime()) / 60000; //360

  var curSize = [];
  var including = []; // including

  for (var i = 0; i < size; i++) {
    including.push({
      start: {
        dateTime: JSON.parse(JSON.stringify(start))
      },
      end: {
        dateTime: JSON.parse(JSON.stringify(end))
      },
      id: 'id_including_' + i
    });
    start.setTime(start.getTime() + 60000 * (interval / (2 * size)));
    end.setTime(end.getTime() - 60000 * (interval / (2 * size)));
  }

  curSize.push(including); // intersecting

  var intersecting = [];
  var step = interval * 2 / (size + 5);
  start = new Date(sT);
  end = new Date(sT);
  end.setTime(start.getTime() + 60000 * step);

  for (var _i4 = 0; _i4 < size; _i4++) {
    intersecting.push({
      start: {
        dateTime: JSON.parse(JSON.stringify(start))
      },
      end: {
        dateTime: JSON.parse(JSON.stringify(end))
      },
      id: 'id_intersecting_' + _i4
    });
    start.setTime(start.getTime() + 60000 * (step / 2));
    end.setTime(end.getTime() + 60000 * (step / 2));
  }

  curSize.push(intersecting); // seperating

  var seperating = [];
  step = interval / (size * 2);
  start = new Date(sT);
  end = new Date(sT);
  end.setTime(start.getTime() + 60000 * step);

  for (var _i5 = 0; _i5 < size; _i5++) {
    seperating.push({
      start: {
        dateTime: JSON.parse(JSON.stringify(start))
      },
      end: {
        dateTime: JSON.parse(JSON.stringify(end))
      },
      id: 'id_seperating_' + _i5
    });
    start.setTime(start.getTime() + 60000 * 2 * step);
    end.setTime(end.getTime() + 60000 * 2 * step);
  }

  curSize.push(seperating); // exact match

  var exactMatch = [];
  start = new Date(sT);
  end = new Date(eT);

  for (var _i6 = 0; _i6 < size; _i6++) {
    exactMatch.push({
      start: {
        dateTime: JSON.parse(JSON.stringify(start))
      },
      end: {
        dateTime: JSON.parse(JSON.stringify(end))
      },
      id: 'id_exactMatch_' + _i6
    });
  }

  curSize.push(exactMatch);
  var mixed = [];

  for (var _i7 = 0, _arr2 = [including, intersecting, seperating, exactMatch]; _i7 < _arr2.length; _i7++) {
    var arr = _arr2[_i7];
    var shuffled = arr.sort(function () {
      return 0.5 - Math.random();
    });
    var selected = shuffled.slice(0, size / 4);
    mixed.push.apply(mixed, _toConsumableArray(selected));
  } // mixed


  curSize.push(mixed);
  payloads.push(curSize);
}

console.log("length of payloads: " + payloads.length);
var label = ['including', 'intersect', 'exclude', 'exact match', 'mixed'];

for (var _i2 = 0, _payloads = payloads; _i2 < _payloads.length; _i2++) {
  var payload = _payloads[_i2];

  for (var index in label) {
    console.log(label[index]);
    var data = payload[index];
    console.log("current length is: " + data.length);
    var timer = new Date();

    var _res = MinConflict.Tree_ARC3({
      'test': data
    }, 120, time, {});

    console.log("Tree: ".concat(new Date() - timer));
  }
}

console.log('123123123');

for (var _i3 = 0, _payloads2 = payloads; _i3 < _payloads2.length; _i3++) {
  var _payload = _payloads2[_i3];

  for (var _index in label) {
    console.log(label[_index]);
    var _data = _payload[_index];
    console.log("current length is: " + _data.length);

    var _timer = new Date();

    res = MinConflict.ARC3({
      'test': _data
    }, 120, time, {});
    console.log("AC3: ".concat(new Date() - _timer));
  }
}