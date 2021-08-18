const KMeans = require('../utils/knn');
const csv = require('csvtojson')
const _ = require('lodash');


const dayClasses = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const timeClasses = ['Morning', 'Afternoon'];

async function run() {
  let csvFilePath = './csv/user_1.csv';
  let data = await csv().fromFile(csvFilePath);
  let kmeans = new KMeans(dayClasses, timeClasses, data);
  kmeans.train();
  // console.log(kmeans.timeModel)
  let res = kmeans.predict({
    purpose: 'work',
    participants: [ 'user_3']
  });
  console.error(res);

  csvFilePath = './csv/user_2.csv';
  data = await csv().fromFile(csvFilePath);
  kmeans = new KMeans(dayClasses, timeClasses, data);
  kmeans.train();
  res = kmeans.predict({
    purpose: 'work',
    participants: [ 'user_3', 'user_4']
  });
  console.error(res);
}

run();