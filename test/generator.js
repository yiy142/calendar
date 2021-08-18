
const converter = require('json-2-csv');
const fs = require('fs');

const labels = ['social', 'work', 'party', 'chat'];
const allParticipants = [];

for (let i = 1; i <= 10; i++) {
  allParticipants.push('user_' + i);
}

function run(userCounter) {
  const start = new Date(2021, 4, 1);// May 1st
  const end = new Date(2021, 5, 1); //June 1st

  const userName = 'user_' + userCounter;

  const list = [];
  let index = 1;

  for (d = start; d <= end; d.setDate(d.getDate() + 1)) {
    // 4 hour interval
    const today = new Date(d);
    for (let i = 8; i < 20; i += 4) {
      if (Math.random() <= 0.5) {
        const startTime = randomDate(today, i, i + 2);
        const endTime = randomDate(today, i + 2, i + 4);
        list.push(dummy(startTime, endTime, index, userName))
      }
    }
    index += 1;
  }

  converter.json2csv(list, (err, csv) => {
    if (err) {
      throw err;
    }
    // write CSV to a file
    fs.writeFileSync('./csv/' + userName + '.csv', csv);
  });
}

function dummy(start, end, index, self) {
  let participants = [];
  const length = Math.floor(Math.random() * 10);
  const shuffled = allParticipants.sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, length);
  selected.forEach(select => {
    if (select != self) {
      participants.push({
        email: select,
      });
    }
  })

  return {
    kind: 'calendar#event',
    id: 'id_' + index,
    summary: '' + index,
    description: labels[Math.floor(Math.random() * 4)],
    attendees: participants,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  }
}
function randomDate(date, startHour, endHour) {
  const newDate = new Date(date);
  var hour = startHour + Math.random() * (endHour - startHour) | 0;
  newDate.setHours(hour);
  return newDate;
}


for (let i = 1; i <= 10; i++) {
  run(i);
}