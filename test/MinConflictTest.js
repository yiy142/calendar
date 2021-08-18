// test vs number of conflicts payload
const MinConflict = require('../utils/min');
// const csvFilePath = "./csv/user_1.csv"
// const csv = require('csvtojson');
// csv().fromFile(csvFilePath)
//   .then((jsonObj) => {
//     console.log(jsonObj);
//   })

const sT = '2021-05-10T18:00:00.00-07:00';
const eT = '2021-05-11T17:00:00.00-07:00';
const time = {
  meeting_start_time: new Date(sT), //9:00
  meeting_end_time: new Date(eT) //15:00
};

const payloads = [];
for (let size of [100, 200, 400, 800]) {
  let start = new Date(sT);
  let end = new Date(eT);
  let interval = (end.getTime() - start.getTime()) / 60000; //360
  const curSize = [];
  let including = [];

  // including
  for (let i = 0; i < size; i++) {
    including.push({
      start: { dateTime: JSON.parse(JSON.stringify(start)) },
      end: { dateTime: JSON.parse(JSON.stringify(end)) },
      id: 'id_including_' + i
    });
    start.setTime(start.getTime() + 60000 * (interval / (2 * size)));
    end.setTime(end.getTime() - 60000 * (interval / (2 * size)));
  }
  curSize.push(including);

  // intersecting
  let intersecting = [];
  let step = (interval * 2) / (size+5);
  start = new Date(sT);
  end = new Date(sT);
  end.setTime(start.getTime() + 60000 * step);
  for (let i = 0; i < size; i++) {
    intersecting.push({
      start: { dateTime: JSON.parse(JSON.stringify(start)) },
      end: { dateTime: JSON.parse(JSON.stringify(end)) },
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
      start: { dateTime: JSON.parse(JSON.stringify(start)) },
      end: { dateTime: JSON.parse(JSON.stringify(end)) },
      id: 'id_seperating_' + i
    });
    start.setTime(start.getTime() + 60000 * 2 * step);
    end.setTime(end.getTime() + 60000 * 2 * step);
  }
  curSize.push(seperating);

  // exact match
  let exactMatch = [];
  start = new Date(sT);
  end = new Date(eT);
  for (let i = 0; i < size; i++) {
    exactMatch.push({
      start: { dateTime: JSON.parse(JSON.stringify(start)) },
      end: { dateTime: JSON.parse(JSON.stringify(end)) },
      id: 'id_exactMatch_' + i
    });
  }
  curSize.push(exactMatch);

  let mixed = [];
  for (let arr of [including, intersecting, seperating, exactMatch]) {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, size / 4);
    mixed.push(...selected);
  }
  // mixed
  curSize.push(mixed);
  payloads.push(curSize);
}
console.log("length of payloads: " + payloads.length);
const label = ['including', 'intersect', 'exclude', 'exact match', 'mixed'];
for (let payload of payloads) {
  for (let index in label) {
    console.log(label[index]);
    const data = payload[index];
    console.log("current length is: " + data.length);
    let timer = new Date();
    let res = MinConflict.Tree_ARC3({ 'test': data }, 120, time, {});
    console.log(`Tree: ${new Date() - timer}`);
  }
}

console.log('123123123');

for (let payload of payloads) {
  for (let index in label) {
    console.log(label[index]);
    const data = payload[index];
    console.log("current length is: " + data.length);
    let timer = new Date();
    res = MinConflict.ARC3({ 'test': data }, 120, time, {});
    console.log(`AC3: ${new Date() - timer}`);
  }
}