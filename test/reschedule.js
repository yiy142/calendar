const MinConflict = require('../utils/min');
const _ = require('lodash');
const util = require('util')


const sT = '2021-05-11T01:00:00.00-07:00';
const eT = '2021-05-11T11:00:00.00-07:00';
const time = {
  meeting_start_time: new Date(sT), //8:00
  meeting_end_time: new Date(eT) //18:00
};

const payloads = [];
for (let size of [4]) {
  let start = new Date(sT);
  let end = new Date(eT);
  let interval = (end.getTime() - start.getTime()) / 60000; //360
  const curSize = [];
  let including = [];

  // including
  for (let i = 0; i < size; i++) {
    including.push({
      start: { dateTime: new Date(start) },
      end: { dateTime: new Date(end) },
      id: 'id_including_' + i
    });
    start.setTime(start.getTime() + 60000 * (interval / (2 * size)));
    end.setTime(end.getTime() - 60000 * (interval / (2 * size)));
  }
  curSize.push(including);

  // intersecting
  let intersecting = [];
  let step = (interval * 2) / (size + 1);
  start = new Date(sT);
  end = new Date(sT);
  end.setTime(start.getTime() + 60000 * step);
  for (let i = 0; i < size; i++) {
    intersecting.push({
      start: { dateTime: new Date(start) },
      end: { dateTime: new Date(end) },
      id: 'id_intersecting_' + i
    });
    start.setTime(start.getTime() + 60000 * (step / 2));
    end.setTime(end.getTime() + 60000 * (step / 2));
  }
  curSize.push(intersecting);

  // seperating
  let seperating = [];
  step = (interval) / (size * 2);
  start = new Date(sT);
  end = new Date(sT);
  end.setTime(start.getTime() + 60000 * step);
  for (let i = 0; i < size; i++) {
    seperating.push({
      start: { dateTime: new Date(start) },
      end: { dateTime: new Date(end) },
      id: 'id_seperating_' + i
    });
    start.setTime(start.getTime() + 60000 * 2 * step);
    end.setTime(end.getTime() + 60000 * 2 * step);
  }
  curSize.push(seperating);
  payloads.push(curSize);
}
const label = ['including', 'intersecting', 'seperating'];
console.log(payloads[0][0]);
for (let payload of payloads) {
  for (let index in label) {
    const data = payload[index];
    const { slot, root, conflicts } = MinConflict.Tree_ARC3({ 'test': data }, 120, time, {});
    console.log("in " + label[index] + ". Old counter is: ");
    console.log(slot[0].counter);

    for (let i = 0; i < 4; i++) {
      // release a constraint
      const constraintID = `event:test:id_${label[index]}_${i}`;
      let { clean, root: newRoot, conflicts: newConflicts, notModified } = MinConflict.releasingConstraint(
        constraintID,
        { conflicts, root});
      if (clean) {
        console.log("cleaned");
        console.log("0")
        continue;
      } 
      const ans = MinConflict.bestSlot(newRoot, {
        duration: 120,
        time,
      });
      const curBest = (_.orderBy(ans, ['slot.counter', 'slot.left'], ['asc', 'asc']))[0];
      console.log("new counter is: ");
      console.log(curBest);
      break;
    }
    break;
  }
}