const express = require("express");
const bodyParser = require('body-parser');
const mongodb = require("mongodb");
const path = require('path');

const colors = require("colors/safe");
const _ = require("lodash");
const app = express();
const cors = require('cors');
const argv = require('minimist')(process.argv.slice(2));
const calendarAPIs = require('./API/calendarAPIs');
const preferenceAPIs = require('./API/preferenceAPIs');
const UserProfile = require("./models/userProfile.model");

function log(text) {
  console.log(`${colors.blue("[store]")} ${text}`);
}

const whiteList = ['http://localhost'];
var corsOptions = {
  // origin: function (origin, callback) {
  //   if (whiteList.indexOf(origin) !== -1) {
  //     callback(null, true);
  //   }
  //   else {
  //     callback(new Error('Not allowed Cors'));
  //   }
  // },
  optionsSuccessStatus: 200
}

let port;
if (argv.port) {
  port = argv.port;
  console.log('using port ' + port);
} else {
  port = 8888;
  console.log('no port specified: using 8888\nUse the --port flag to change');
}

const mongoose = require("mongoose");
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

function mongoConnectWithRetry(delayInMilliseconds, callback) {
  mongoose.connect('mongodb://127.0.0.1:27017/calendar', {
    useNewUrlParser: true
  }, (err, connection) => {
    if (err) {
      log(`Error connecting to MongoDB: ${err}`);
      setTimeout(
        () => mongoConnectWithRetry(delayInMilliseconds, callback),
        delayInMilliseconds
      );
    } else {
      log("connected succesfully to mongodb");
      callback(connection);
    }
  }
  );
}
function serve() {
  mongoConnectWithRetry(2000, connection => {
    log('Connected to mongo server.');
    app.use(cors(corsOptions));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(bodyParser.raw());
    app.options('*', cors());
    app.use(express.json());
    calendarAPIs(app);
    preferenceAPIs(app);
    app.get('/login', (req, res) => {
      res.sendFile(path.join(__dirname, '/index.html'));
    });

    app.get('/users/list', async (req, res) => {
      try {
        const results = await UserProfile.aggregate([
          {
            $match: {
              email: { $ne: "calendarmiddleman@gmail.com" },
              calendarId: { $ne: null },
            }
          }
        ]).exec();
        res.status(200).send((results.map(el => ({ id: el.email, name: el.name }))));
      } catch (e) {
        res.status(500).send(e);
      }
    });

    app.post('/users/get', async (req, res) => {
      try {
        const results = await UserProfile.find(
          {
            email: req.body.email,
          }
        ).exec();        
        res.status(200).send((results.map(el => ({ id: el.calendarId, name: el.name }))));
      } catch (e) {
        res.status(500).send(e);
      }
    });

    // app.get('/', (req, res) => {
    //   res.sendFile(path.join(__dirname, '/home.html'));
    // })
    app.listen(port,
      () => log(`Server is running at port ${port}`));
  });
}

serve();

