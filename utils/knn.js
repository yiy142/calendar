const csv = require('csvtojson')
const _ = require('lodash');
const purposes = ['social', 'chat', 'work', 'normal'];

function getPurpose(description) {
  if (!description) return 'normal';
  for (let purpose of purposes) {
    if (description.includes(purpose)) return purpose;
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
class KMeans {
  constructor(_dayCentroids, _timeCentroids, _points) {
    this.dayCentroids = _dayCentroids;
    this.timeCentroids = _timeCentroids;
    this.points = _points;
    this.dayModel = {};
    this.timeModel = {};
  }
  getTime(date) {
    return this.timeCentroids[(date.getHours() - 12) >= 0 ? 1 : 0];
  }

  train() {
    const { points, dayCentroids, dayModel, timeCentroids, timeModel } = this;
    // supervised learning, give each data point a symbol
    points.forEach((point, index) => {
      const start = new Date(point.start.dateTime),
        end = new Date(point.end.dateTime);
      if (start.getDay() !== end.getDay()) {
        console.error('Does not support meeting scheduled across two days')
        return;
      }
      let attendees = [];
      if (!point.attendees instanceof Object) {
        attendees = JSON.parse(point.attendees);
      } else {
        attendees = point.attendees;
      }
      points[index] = {
        ...point,
        purpose: getPurpose(point.description),
        dayClass: dayCentroids[start.getDay()],
        timeClass: this.getTime(start),
        participants: (attendees || []).map(el => el.email)
      };
    });
    dayCentroids.forEach(centroid => {
      dayModel[centroid] = [];
    });
    timeCentroids.forEach(centroid => {
      timeModel[centroid] = [];
    });
    points.forEach((point) => {
      const featureClasses = [dayModel[point.dayClass], timeModel[point.timeClass]];
      featureClasses.forEach((featureClass) => {
        point.participants.forEach(participant => {
          let flag = false;
          featureClass.forEach(el => {
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
            })
          }
        });
      });
    });
  }
  // predict by compromised parameters
  // if have met with the same guy doing the same thing, decrease the distance by the counter
  // if met with the same guy doing other things or doing the same thing with other guys, decrease the distance by half of counter
  predict(dataPoint) {
    const { dayModel, timeModel } = this;
    // daySymbolDistance, timeSymbolDistance
    const distances = [{}, {}];
    [dayModel, timeModel].forEach((model, index) => {
      Object.keys(model).forEach(symbol => {
        let distance = 0;
        const filteredByDesc = model[symbol].filter(el => el.purpose === dataPoint.purpose);
        filteredByDesc.forEach(participantWithCounter => {
          if (dataPoint.participants.includes(participantWithCounter.participantName)) {
            distance -= participantWithCounter.count;
          }
        });
        distances[index][symbol] = distance;
      });
    });
    const sum = Object.values(distances[0]).reduce((pre, cur) => {
      return pre + cur;
    }, 0);

    // if no match with the guy and purpose, compromise
    if (sum === 0) {
      Object.keys(dayModel).forEach(symbol => {
        let distance = 0;
        const filteredByDesc = dayModel[symbol].filter(el => el.purpose === dataPoint.purpose);
        distance -= filteredByDesc.length;

        dayModel[symbol].forEach(participantWithCounter => {
          if (dataPoint.participants.includes(participantWithCounter.participantName)) {
            distance -= participantWithCounter.count;
          }
        });
        distances[0][symbol] = distance;
      })
    }
    return {
      day: distances[0],
      time: distances[1]
    }
  }
}

const dayClasses = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const timeClasses = ['Morning', 'Afternoon'];

async function run() {
  const csvFilePath = './csv/user_1.csv';
  const data = await csv().fromFile(csvFilePath);

  const kmeans = new KMeans(dayClasses, timeClasses, data);
  kmeans.train();
  const res = kmeans.predict({
    description: 'social',
    participants: ['user_1', 'user_2']
  });
  console.error(res);
}

module.exports = KMeans;


const model = {
  'Monday': [
    { count: 1, participantName: "Tom", purpose: "social" },
    { count: 1, participantName: "Tom", purpose: "work" },
    { count: 1, participantName: "Bob", purpose: "social" }
  ],
  'Tuesday': [
    { count: 1, participantName: "Tom",purpose: "chat" }
  ]
}