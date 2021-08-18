"use strict";

var MinConflict = require('../utils/min');

var _ = require('lodash');

var util = require('util');

var sT = '2021-05-11T01:00:00.00-07:00';
var eT = '2021-05-11T11:00:00.00-07:00';
var time = {
  meeting_start_time: new Date(sT),
  //8:00
  meeting_end_time: new Date(eT) //18:00

};
var payloads = [];

for (var _i = 0, _arr = [4]; _i < _arr.length; _i++) {
  var size = _arr[_i];
  var start = new Date(sT);
  var end = new Date(eT);
  var interval = (end.getTime() - start.getTime()) / 60000; //360

  var curSize = [];
  var including = []; // including

  for (var i = 0; i < size; i++) {
    including.push({
      start: {
        dateTime: new Date(start)
      },
      end: {
        dateTime: new Date(end)
      },
      id: 'id_including_' + i
    });
    start.setTime(start.getTime() + 60000 * (interval / (2 * size)));
    end.setTime(end.getTime() - 60000 * (interval / (2 * size)));
  }

  curSize.push(including); // intersecting

  var intersecting = [];
  var step = interval * 2 / (size + 1);
  start = new Date(sT);
  end = new Date(sT);
  end.setTime(start.getTime() + 60000 * step);

  for (var _i3 = 0; _i3 < size; _i3++) {
    intersecting.push({
      start: {
        dateTime: new Date(start)
      },
      end: {
        dateTime: new Date(end)
      },
      id: 'id_intersecting_' + _i3
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

  for (var _i4 = 0; _i4 < size; _i4++) {
    seperating.push({
      start: {
        dateTime: new Date(start)
      },
      end: {
        dateTime: new Date(end)
      },
      id: 'id_seperating_' + _i4
    });
    start.setTime(start.getTime() + 60000 * 2 * step);
    end.setTime(end.getTime() + 60000 * 2 * step);
  }

  curSize.push(seperating);
  payloads.push(curSize);
}

var label = ['including', 'intersecting', 'seperating'];
console.log(payloads[0][0]);

for (var _i2 = 0, _payloads = payloads; _i2 < _payloads.length; _i2++) {
  var payload = _payloads[_i2];

  for (var index in label) {
    var data = payload[index];

    var _MinConflict$Tree_ARC = MinConflict.Tree_ARC3({
      'test': data
    }, 120, time, {}),
        slot = _MinConflict$Tree_ARC.slot,
        root = _MinConflict$Tree_ARC.root,
        conflicts = _MinConflict$Tree_ARC.conflicts;

    console.log("in " + label[index] + ". Old counter is: ");
    console.log(slot[0].counter);

    for (var _i5 = 0; _i5 < 4; _i5++) {
      // release a constraint
      var constraintID = "event:test:id_".concat(label[index], "_").concat(_i5);

      var _MinConflict$releasin = MinConflict.releasingConstraint(constraintID, {
        conflicts: conflicts,
        root: root
      }),
          clean = _MinConflict$releasin.clean,
          newRoot = _MinConflict$releasin.root,
          newConflicts = _MinConflict$releasin.conflicts,
          notModified = _MinConflict$releasin.notModified;

      if (clean) {
        console.log("cleaned");
        console.log("0");
        continue;
      }

      var ans = MinConflict.bestSlot(newRoot, {
        duration: 120,
        time: time
      });

      var curBest = _.orderBy(ans, ['slot.counter', 'slot.left'], ['asc', 'asc'])[0];

      console.log("new counter is: ");
      console.log(curBest);
      break;
    }

    break;
  }
}