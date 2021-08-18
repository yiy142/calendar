"use strict";

var converter = require('json-2-csv');

var fs = require('fs');

var labels = ['social', 'work', 'party', 'chat'];
var allParticipants = [];

for (var i = 1; i <= 10; i++) {
  allParticipants.push('user_' + i);
}

function run(userCounter) {
  var start = new Date(2021, 4, 1); // May 1st

  var end = new Date(2021, 5, 1); //June 1st

  var userName = 'user_' + userCounter;
  var list = [];
  var index = 1;

  for (d = start; d <= end; d.setDate(d.getDate() + 1)) {
    // 4 hour interval
    var today = new Date(d);

    for (var _i = 8; _i < 20; _i += 4) {
      if (Math.random() <= 0.5) {
        var startTime = randomDate(today, _i, _i + 2);
        var endTime = randomDate(today, _i + 2, _i + 4);
        list.push(dummy(startTime, endTime, index, userName));
      }
    }

    index += 1;
  }

  converter.json2csv(list, function (err, csv) {
    if (err) {
      throw err;
    } // write CSV to a file


    fs.writeFileSync('./csv/' + userName + '.csv', csv);
  });
}

function dummy(start, end, index, self) {
  var participants = [];
  var length = Math.floor(Math.random() * 10);
  var shuffled = allParticipants.sort(function () {
    return 0.5 - Math.random();
  });
  var selected = shuffled.slice(0, length);
  selected.forEach(function (select) {
    if (select != self) {
      participants.push({
        email: select
      });
    }
  });
  return {
    kind: 'calendar#event',
    id: 'id_' + index,
    summary: '' + index,
    description: labels[Math.floor(Math.random() * 4)],
    attendees: participants,
    start: {
      dateTime: start.toISOString()
    },
    end: {
      dateTime: end.toISOString()
    }
  };
}

function randomDate(date, startHour, endHour) {
  var newDate = new Date(date);
  var hour = startHour + Math.random() * (endHour - startHour) | 0;
  newDate.setHours(hour);
  return newDate;
}

for (var _i2 = 1; _i2 <= 10; _i2++) {
  run(_i2);
}