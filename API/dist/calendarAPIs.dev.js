"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var host = "https://71be990f4d73.ngrok.io";

var _require = require('googleapis'),
    google = _require.google;

var MinConflict = require('../utils/min');

var UserToken = require("../models/userToken.model");

var UserProfile = require("../models/userProfile.model");

var UserPreference = require("../models/userPreference.model");

var CalendarWatch = require("../models/calendar.model");

var axios = require('axios');

var fs = require('fs');

var colors = require("colors/safe");

var _ = require('lodash');

var KMeans = require('../utils/knn');

var path = require('path');

var _require2 = require('uuid'),
    uuidv4 = _require2.v4;

var moment = require('moment');

var records = {};

var Node = function Node(_left, _right, _counter, _payload) {
  _classCallCheck(this, Node);

  this.left = _left;
  this.right = _right;
  this.counter = _counter;
  this.child = null;
  this.next = null;
  this.events = _payload;
};

var oAuth2Client;
var globalCredentials;

var initOAuth = function initOAuth() {
  fs.readFile(path.join(__dirname, '../credentials.json'), function _callee(err, content) {
    var credentials;
    return regeneratorRuntime.async(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!err) {
              _context.next = 3;
              break;
            }

            log('Error loading client secret file:', err);
            return _context.abrupt("return");

          case 3:
            ;
            credentials = JSON.parse(content);
            globalCredentials = credentials.web;
            oAuth2Client = new google.auth.OAuth2(globalCredentials.client_id, globalCredentials.client_secret, globalCredentials.redirect_uris[0]);

          case 7:
          case "end":
            return _context.stop();
        }
      }
    });
  });
};

initOAuth();
var SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.profile'];

function log(text) {
  console.log("".concat(colors.blue("[calendarAPI]"), " ").concat(text));
}

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

function filterByPreference(gRes, req, res, user_id, candidateDates, calendarId) {
  var userPreference, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _date, currentEvents, curDay;

  return regeneratorRuntime.async(function filterByPreference$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return regeneratorRuntime.awrap(UserPreference.findOne({
            user_id: user_id
          }));

        case 3:
          userPreference = _context2.sent;
          // get day_off
          userPreference.day_off.forEach(function (dayOff) {
            if (Object.keys(gRes.day).includes(dayOff)) {
              gRes.day[dayOff] += 100;
            }
          }); //get max_meeting

          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context2.prev = 8;
          _iterator2 = candidateDates[Symbol.iterator]();

        case 10:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context2.next = 20;
            break;
          }

          _date = _step2.value;
          req.body = _objectSpread({}, req.body, {
            calendarId: calendarId,
            date: _date
          });
          _context2.next = 15;
          return regeneratorRuntime.awrap(apis.listEvents(req, res));

        case 15:
          currentEvents = _context2.sent;

          if (currentEvents.length + 1 > userPreference.max_meeting) {
            curDay = new Date(_date);
            gRes.day['' + curDay.getDay()] += 100;
          }

        case 17:
          _iteratorNormalCompletion2 = true;
          _context2.next = 10;
          break;

        case 20:
          _context2.next = 26;
          break;

        case 22:
          _context2.prev = 22;
          _context2.t0 = _context2["catch"](8);
          _didIteratorError2 = true;
          _iteratorError2 = _context2.t0;

        case 26:
          _context2.prev = 26;
          _context2.prev = 27;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 29:
          _context2.prev = 29;

          if (!_didIteratorError2) {
            _context2.next = 32;
            break;
          }

          throw _iteratorError2;

        case 32:
          return _context2.finish(29);

        case 33:
          return _context2.finish(26);

        case 34:
          _context2.next = 39;
          break;

        case 36:
          _context2.prev = 36;
          _context2.t1 = _context2["catch"](0);
          throw _context2.t1;

        case 39:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 36], [8, 22, 26, 34], [27,, 29, 33]]);
}

function mmAuth(req, res, next) {
  return regeneratorRuntime.async(function mmAuth$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          UserToken.find({
            user_id: 'calendarmiddleman@gmail.com'
          }, function (err, mmToken) {
            if (err) {
              res.status(500).send('err in db');
            }

            if (mmToken.length === 1) {
              oAuth2Client.setCredentials(mmToken[0]);
              next();
            } else res.status(500).send('mm token missing');
          });

        case 1:
        case "end":
          return _context3.stop();
      }
    }
  });
}

function auth(req, res, next) {
  var _req$body, userLoginToken, code, userID, ticket, payload;

  return regeneratorRuntime.async(function auth$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _req$body = req.body, userLoginToken = _req$body.userLoginToken, code = _req$body.code;

          if (!userLoginToken) {
            res.status(400).send('login required');
          }

          _context5.prev = 2;
          _context5.next = 5;
          return regeneratorRuntime.awrap(oAuth2Client.verifyIdToken({
            idToken: userLoginToken,
            audience: globalCredentials.client_id
          }));

        case 5:
          ticket = _context5.sent;
          payload = ticket.getPayload();
          UserProfile.find({
            email: payload['email']
          }, function _callee2(err, result) {
            var newProfile;
            return regeneratorRuntime.async(function _callee2$(_context4) {
              while (1) {
                switch (_context4.prev = _context4.next) {
                  case 0:
                    if (!err) {
                      _context4.next = 3;
                      break;
                    }

                    log("db error");
                    throw err;

                  case 3:
                    if (!(result.length > 1)) {
                      _context4.next = 5;
                      break;
                    }

                    throw new Error('multiple user with same email');

                  case 5:
                    if (result.length === 0) {
                      newProfile = new UserProfile(_objectSpread({}, payload, {
                        calendarId: null
                      }));
                      newProfile.save().then()["catch"](function (e) {
                        throw e;
                      });
                    }

                    userID = payload['email'];
                    UserToken.find({
                      user_id: userID
                    }, function (error, result) {
                      if (error) {
                        res.status(500).json(error);
                      }

                      if (result.length === 0) {
                        if (!!code) {
                          oAuth2Client.getToken(code, function (err, token) {
                            if (err) {
                              res.status(500).send('Error retrieving access token');
                            } else {
                              log("request token credentials from google");
                              oAuth2Client.setCredentials(token);
                              var newToken = new UserToken(_objectSpread({
                                user_id: userID
                              }, token));
                              newToken.save().then(function () {
                                req.body = _objectSpread({}, req.body, {
                                  // oAuth2Client,
                                  userID: userID
                                });
                                next();
                              })["catch"](function (error) {
                                res.status(500).json(error);
                              });
                            }
                          });
                        } else {
                          log("token not found, request new token");
                          var authUrl = oAuth2Client.generateAuthUrl({
                            access_type: 'offline',
                            scope: SCOPES
                          });
                          res.status(200).send({
                            type: "authUrl",
                            authUrl: authUrl
                          });
                        }
                      } else if (result.length === 1) {
                        oAuth2Client.setCredentials(result[0]);
                        req.body = _objectSpread({}, req.body, {
                          userID: userID
                        });
                        next();
                      } else {
                        res.status(500).send("multiple tokens found!");
                      }
                    });

                  case 8:
                  case "end":
                    return _context4.stop();
                }
              }
            });
          });
          _context5.next = 14;
          break;

        case 10:
          _context5.prev = 10;
          _context5.t0 = _context5["catch"](2);
          log(_context5.t0);
          res.status(500).send(_context5.t0);

        case 14:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[2, 10]]);
}

var apis = {
  onChange: _.debounce(function _callee4(req, res) {
    var _req$headers, channelId, resourceId, state, calendarWatch, calendarId, treeArcNodes, mmToken, calendar, gRes, items, deletedEvents, newEvents, newEvent, _key, _loop, _i, _Object$keys, _ret, deletedEvent, deletedID, key, _i2, _Object$keys2, eventId, _treeArcNodes$eventId2, ArcInfo, eventMeta, _MinConflict$releasin, clean, root, conflicts, notModified, _key2, _endDate, ans, curBest, endDate, _i3, _Object$keys3, _eventId, _key3, _ArcInfo, newConflicts;

    return regeneratorRuntime.async(function _callee4$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            log("in debounced onchange");
            _req$headers = req.headers, channelId = _req$headers['x-goog-channel-id'], resourceId = _req$headers['x-goog-resource-id'], state = _req$headers['x-goog-resource-state'];

            if (!(state === 'sync')) {
              _context8.next = 5;
              break;
            }

            console.log("now in sync， ignored");
            return _context8.abrupt("return");

          case 5:
            _context8.next = 7;
            return regeneratorRuntime.awrap(CalendarWatch.findOne({
              "channelInfo.id": channelId
            }).exec());

          case 7:
            calendarWatch = _context8.sent;

            if (calendarWatch) {
              _context8.next = 11;
              break;
            }

            log("No Calendar Watch info found!");
            return _context8.abrupt("return");

          case 11:
            calendarId = calendarWatch.calendarId;
            treeArcNodes = calendarWatch.treeArcNodes;

            if (Object.keys(treeArcNodes || {}).length) {
              _context8.next = 16;
              break;
            }

            log("calendar is not in any meeting, stopped");
            return _context8.abrupt("return");

          case 16:
            _context8.next = 18;
            return regeneratorRuntime.awrap(UserToken.findOne({
              user_id: 'calendarmiddleman@gmail.com'
            }).exec());

          case 18:
            mmToken = _context8.sent;
            oAuth2Client.setCredentials(mmToken);
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });

            if (calendarWatch.syncToken) {
              _context8.next = 24;
              break;
            }

            log("No Sync Token, stopped");
            return _context8.abrupt("return");

          case 24:
            _context8.next = 26;
            return regeneratorRuntime.awrap(calendar.events.list({
              calendarId: calendarId,
              syncToken: calendarWatch.syncToken
            }));

          case 26:
            gRes = _context8.sent;
            _context8.next = 29;
            return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
              calendarId: calendarId
            }, {
              $set: {
                syncToken: gRes.data.nextSyncToken
              }
            }).exec());

          case 29:
            items = gRes.data.items || [];
            console.log("changed items: ");
            console.log(items);
            _context8.next = 34;
            return regeneratorRuntime.awrap(Promise.all(items.map(function _callee3(el) {
              var _res;

              return regeneratorRuntime.async(function _callee3$(_context6) {
                while (1) {
                  switch (_context6.prev = _context6.next) {
                    case 0:
                      if (!(el.status === 'cancelled')) {
                        _context6.next = 5;
                        break;
                      }

                      _context6.next = 3;
                      return regeneratorRuntime.awrap(calendar.events.get({
                        calendarId: calendarId,
                        eventId: el.id
                      }));

                    case 3:
                      _res = _context6.sent;
                      return _context6.abrupt("return", _res.data);

                    case 5:
                    case "end":
                      return _context6.stop();
                  }
                }
              });
            })));

          case 34:
            _context8.t0 = function (el) {
              return !!el;
            };

            deletedEvents = _context8.sent.filter(_context8.t0);
            newEvents = items.filter(function (el) {
              return (el || {}).status === 'confirmed';
            });

            if (!deletedEvents.length) {
              log("No deleted events");
            }

            if (!newEvents.length) {
              log("No new added events");
            }

            if (!(!deletedEvents.length && !newEvents.length)) {
              _context8.next = 41;
              break;
            }

            return _context8.abrupt("return");

          case 41:
            if (!(!deletedEvents.length === 1 || !newEvents.length === 1)) {
              _context8.next = 44;
              break;
            }

            log("multiple events got updated at once! stopped");
            return _context8.abrupt("return");

          case 44:
            if (!(deletedEvents.length > 0 && newEvents.length > 0)) {
              _context8.next = 47;
              break;
            }

            log("adding and deleting happended at the same time! stopped! ");
            return _context8.abrupt("return");

          case 47:
            // Moved Event
            newEvent = newEvents[0]; // if (newEvent && newEvent.id === calendarWatch.lastEventId) {

            if (!newEvent) {
              _context8.next = 70;
              break;
            }

            log("in moved event");
            _key = "treeArcNodes." + newEvent.id + ".eventMeta.dateTime"; // update the database for moved event's start and end time

            _context8.next = 53;
            return regeneratorRuntime.awrap(CalendarWatch.updateMany({
              calendarId: calendarId
            }, {
              "$set": _defineProperty({}, _key, {
                start: newEvent.start.dateTime,
                end: newEvent.end.dateTime
              })
            }).exec());

          case 53:
            _loop = function _loop() {
              var eventId, _treeArcNodes$eventId, ArcInfo, eventMeta, conflicts, root, ans, curBest, endDate, key;

              return regeneratorRuntime.async(function _loop$(_context7) {
                while (1) {
                  switch (_context7.prev = _context7.next) {
                    case 0:
                      eventId = _Object$keys[_i];
                      log("eventId: " + eventId);

                      if (!(eventId === newEvent.id)) {
                        _context7.next = 4;
                        break;
                      }

                      return _context7.abrupt("return", "continue");

                    case 4:
                      _treeArcNodes$eventId = treeArcNodes[eventId], ArcInfo = _treeArcNodes$eventId.ArcInfo, eventMeta = _treeArcNodes$eventId.eventMeta;

                      if (!(!ArcInfo || !eventMeta)) {
                        _context7.next = 8;
                        break;
                      }

                      log("no data stored!");
                      return _context7.abrupt("return", "continue");

                    case 8:
                      conflicts = [];

                      if (ArcInfo.conflicts.map(function (el) {
                        return el.id;
                      }).includes("event:".concat(calendarId, ":").concat(newEvent.id))) {
                        conflicts = ArcInfo.conflicts.map(function (el) {
                          if (el.id === "event:".concat(calendarId, ":").concat(newEvent.id)) {
                            return _objectSpread({}, el, {
                              left: newEvent.start.dateTime,
                              right: newEvent.end.dateTime
                            });
                          }

                          return el;
                        });
                      } else {
                        conflicts = [].concat(_toConsumableArray(ArcInfo.conflicts), [{
                          "type": "event",
                          "id": "event:".concat(calendarId, ":").concat(newEvent.id),
                          "left": new Date(newEvent.start.dateTime),
                          "right": new Date(newEvent.end.dateTime),
                          "counter": 1
                        }]);
                      }

                      console.log(conflicts);

                      if (conflicts.length) {
                        _context7.next = 14;
                        break;
                      }

                      log("conflict array is empty");
                      return _context7.abrupt("return", "continue");

                    case 14:
                      ;
                      conflicts = _.orderBy(conflicts, ['left', 'right'], ['asc', 'desc']);
                      root = new Node(conflicts[0].left, conflicts[0].right, conflicts[0].counter, [conflicts[0].id]);
                      conflicts.slice(1).forEach(function (conflict) {
                        MinConflict.recursiveBuildTree(root, conflict);
                      });
                      ans = MinConflict.bestSlot(root, {
                        time: ArcInfo.time,
                        duration: eventMeta.duration
                      });
                      curBest = _.orderBy(ans, ['counter', 'left'], ['asc', 'asc'])[0];
                      console.log(curBest); // change current event's time and push to google calendar

                      endDate = moment(curBest.left).add(parseInt(curBest.duration), "m").toDate().toISOString();

                      if (!(new Date(curBest.left).getTime() == new Date(eventMeta.dateTime.start).getTime())) {
                        _context7.next = 29;
                        break;
                      }

                      console.log(curBest.left);
                      console.log(eventMeta.dateTime.start);
                      log("end of loop!");
                      _context7.next = 28;
                      return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
                        calendarId: calendarId
                      }, {
                        "$set": {
                          lastEventId: null
                        }
                      }).exec());

                    case 28:
                      return _context7.abrupt("return", "continue");

                    case 29:
                      _context7.next = 31;
                      return regeneratorRuntime.awrap(calendar.events.patch({
                        calendarId: calendarId,
                        eventId: eventId,
                        requestBody: {
                          start: {
                            dateTime: curBest.left
                          },
                          end: {
                            dateTime: endDate
                          }
                        }
                      }));

                    case 31:
                      key = "treeArcNodes." + eventId;
                      _context7.next = 34;
                      return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
                        calendarId: calendarId
                      }, {
                        "$set": _defineProperty({
                          lastEventId: eventId
                        }, key, {
                          ArcInfo: _objectSpread({}, ArcInfo, {
                            slot: ans,
                            conflicts: conflicts,
                            root: root
                          }),
                          eventMeta: _objectSpread({}, eventMeta, {
                            dateTime: {
                              "start": curBest.left,
                              "end": endDate
                            }
                          })
                        })
                      }));

                    case 34:
                      return _context7.abrupt("return", {
                        v: void 0
                      });

                    case 35:
                    case "end":
                      return _context7.stop();
                  }
                }
              });
            };

            _i = 0, _Object$keys = Object.keys(treeArcNodes);

          case 55:
            if (!(_i < _Object$keys.length)) {
              _context8.next = 68;
              break;
            }

            _context8.next = 58;
            return regeneratorRuntime.awrap(_loop());

          case 58:
            _ret = _context8.sent;
            _context8.t1 = _ret;
            _context8.next = _context8.t1 === "continue" ? 62 : 63;
            break;

          case 62:
            return _context8.abrupt("continue", 65);

          case 63:
            if (!(_typeof(_ret) === "object")) {
              _context8.next = 65;
              break;
            }

            return _context8.abrupt("return", _ret.v);

          case 65:
            _i++;
            _context8.next = 55;
            break;

          case 68:
            _context8.next = 71;
            break;

          case 70:
            log("newly created event, does not modify");

          case 71:
            // Deleted Event
            deletedEvent = deletedEvents[0];

            if (deletedEvent) {
              _context8.next = 75;
              break;
            }

            log("no deleted event, stopped");
            return _context8.abrupt("return");

          case 75:
            deletedID = deletedEvent.id;
            key = "treeArcNodes." + deletedEvent.id; //remove the event itself

            _context8.next = 79;
            return regeneratorRuntime.awrap(CalendarWatch.updateMany({}, {
              $unset: _defineProperty({}, key, 1)
            }).exec());

          case 79:
            // const watches = await CalendarWatch.find({}).exec();
            // for (let watch of watches) {
            //   const cId = watch.calendarId;
            //   if (!watch.treeArcNodes) continue;
            //   for (let eId of Object.keys(watch.treeArcNodes)) {
            //     const conflicts = watch.treeArcNodes[eId].ArcInfo.conflicts;
            //     const key = "treeArcNodes." + eId + ".ArcInfo.conflicts";
            //     const newConflicts = conflicts.filter(el => {
            //       if (el.id === `event:${calendarId}:${deletedID}`) {
            //         return false;
            //       }
            //       return true;
            //     });
            //     console.log("new conflicts: ");
            //     console.log(newConflicts);
            //     await CalendarWatch.updateMany({}, { [key]: newConflicts }).exec();
            //   }
            // }
            console.log("deleted event is: ");
            console.log(deletedEvent);
            _i2 = 0, _Object$keys2 = Object.keys(treeArcNodes);

          case 82:
            if (!(_i2 < _Object$keys2.length)) {
              _context8.next = 123;
              break;
            }

            eventId = _Object$keys2[_i2];

            if (!(eventId === deletedEvent.id)) {
              _context8.next = 86;
              break;
            }

            return _context8.abrupt("continue", 120);

          case 86:
            _treeArcNodes$eventId2 = treeArcNodes[eventId], ArcInfo = _treeArcNodes$eventId2.ArcInfo, eventMeta = _treeArcNodes$eventId2.eventMeta;

            if (ArcInfo) {
              _context8.next = 89;
              break;
            }

            return _context8.abrupt("continue", 120);

          case 89:
            _MinConflict$releasin = MinConflict.releasingConstraint("event:".concat(calendarId, ":").concat(deletedID), ArcInfo), clean = _MinConflict$releasin.clean, root = _MinConflict$releasin.root, conflicts = _MinConflict$releasin.conflicts, notModified = _MinConflict$releasin.notModified;
            _key2 = "treeArcNodes." + eventId; // if we are removing the last conflict

            if (!clean) {
              _context8.next = 101;
              break;
            }

            _endDate = moment(ArcInfo.time.meeting_start_time).add(parseInt(eventMeta.duration), "m").toDate().toISOString();
            _context8.next = 95;
            return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
              calendarId: calendarId
            }, {
              "$set": _defineProperty({
                lastEventId: eventId
              }, _key2, {
                ArcInfo: {
                  slot: {
                    "left": ArcInfo.time.meeting_start_time,
                    "right": ArcInfo.time.meeting_end_time,
                    "counter": 0,
                    "tight": false,
                    "ids": [],
                    "duration": eventMeta.duration
                  },
                  conflicts: [],
                  uuid: ArcInfo.uuid,
                  time: ArcInfo.time,
                  root: null
                },
                eventMeta: _objectSpread({}, eventMeta, {
                  dateTime: {
                    "start": ArcInfo.time.meeting_start_time,
                    "end": _endDate
                  }
                })
              })
            }).exec());

          case 95:
            _context8.next = 97;
            return regeneratorRuntime.awrap(calendar.events.patch({
              calendarId: calendarId,
              eventId: eventId,
              requestBody: {
                start: {
                  dateTime: ArcInfo.time.meeting_start_time
                },
                end: {
                  dateTime: _endDate
                }
              }
            }));

          case 97:
            log("re-scheduled!");
            return _context8.abrupt("return");

          case 101:
            if (root) {
              _context8.next = 106;
              break;
            }

            log("current has the best slot, do not modify");
            return _context8.abrupt("continue", 120);

          case 106:
            if (!notModified) {
              _context8.next = 109;
              break;
            }

            log("deleted event does not affect current scheduled events");
            return _context8.abrupt("continue", 120);

          case 109:
            ans = MinConflict.bestSlot(root, {
              duration: eventMeta.duration,
              time: ArcInfo.time
            });
            curBest = _.orderBy(ans, ['slot.counter', 'slot.left'], ['asc', 'asc'])[0];
            console.log("new best slot is: ");
            console.log(curBest);
            endDate = moment(curBest.left).add(parseInt(curBest.duration), "m").toDate().toISOString();
            _context8.next = 116;
            return regeneratorRuntime.awrap(calendar.events.patch({
              calendarId: calendarId,
              eventId: eventId,
              requestBody: {
                start: {
                  dateTime: curBest.left
                },
                end: {
                  dateTime: endDate
                }
              }
            }));

          case 116:
            _context8.next = 118;
            return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
              calendarId: calendarId
            }, {
              "$set": _defineProperty({
                lastEventId: eventId
              }, _key2, {
                ArcInfo: {
                  slot: curBest,
                  conflicts: conflicts,
                  uuid: ArcInfo.uuid,
                  time: ArcInfo.time,
                  root: root
                },
                eventMeta: _objectSpread({}, eventMeta, {
                  dateTime: {
                    "start": curBest.left,
                    "end": endDate
                  }
                })
              })
            }).exec());

          case 118:
            log("re-scheduled!");
            return _context8.abrupt("break", 123);

          case 120:
            _i2++;
            _context8.next = 82;
            break;

          case 123:
            _i3 = 0, _Object$keys3 = Object.keys(treeArcNodes);

          case 124:
            if (!(_i3 < _Object$keys3.length)) {
              _context8.next = 136;
              break;
            }

            _eventId = _Object$keys3[_i3];
            _key3 = "treeArcNodes." + _eventId + '.ArcInfo.conflicts';
            _ArcInfo = treeArcNodes[_eventId].ArcInfo;

            if (_ArcInfo) {
              _context8.next = 130;
              break;
            }

            return _context8.abrupt("continue", 133);

          case 130:
            newConflicts = _ArcInfo.conflicts.filter(function (el) {
              if (el.id === "event:".concat(calendarId, ":").concat(deletedID)) {
                return false;
              }

              return true;
            });
            _context8.next = 133;
            return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
              calendarId: calendarId
            }, {
              "$set": _defineProperty({}, _key3, newConflicts)
            }).exec());

          case 133:
            _i3++;
            _context8.next = 124;
            break;

          case 136:
          case "end":
            return _context8.stop();
        }
      }
    });
  }, 5000),
  pushCalendar: function pushCalendar(req, res) {
    var _req$body2, calendarId, attendees, description, dateTime, summary, uuid, duration, calendar, gRes, calendarWatch, arcInfo, newCalendar, key;

    return regeneratorRuntime.async(function pushCalendar$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _req$body2 = req.body, calendarId = _req$body2.calendarId, attendees = _req$body2.attendees, description = _req$body2.description, dateTime = _req$body2.dateTime, summary = _req$body2.summary, uuid = _req$body2.uuid, duration = _req$body2.duration;
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context9.prev = 2;
            _context9.next = 5;
            return regeneratorRuntime.awrap(calendar.events.insert({
              calendarId: calendarId,
              sendUpdates: "all",
              sendNotifications: true,
              requestBody: {
                attendees: attendees.map(function (attendee) {
                  return {
                    email: attendee,
                    responseStatus: "needsAction"
                  };
                }),
                description: description,
                start: {
                  dateTime: new Date(dateTime.start).toISOString()
                },
                end: {
                  dateTime: new Date(dateTime.end).toISOString()
                },
                summary: summary
              }
            }));

          case 5:
            gRes = _context9.sent;
            _context9.next = 8;
            return regeneratorRuntime.awrap(CalendarWatch.findOne({
              calendarId: calendarId
            }).exec());

          case 8:
            calendarWatch = _context9.sent;

            if (uuid) {
              _context9.next = 11;
              break;
            }

            throw new Error("No UUID for ARC nodes");

          case 11:
            // const arcInfo = await ARCInfo.findOne({ uuid }).exec();
            arcInfo = records[uuid];

            if (arcInfo) {
              _context9.next = 14;
              break;
            }

            throw new Error("No info for ARC nodes");

          case 14:
            if (calendarWatch) {
              _context9.next = 19;
              break;
            }

            newCalendar = new CalendarWatch({
              calendarId: calendarId,
              lastEventId: null,
              treeArcNodes: _defineProperty({}, gRes.data.id, {
                ArcInfo: arcInfo,
                eventMeta: {
                  attendees: attendees,
                  description: description,
                  dateTime: dateTime,
                  summary: summary,
                  duration: duration
                }
              })
            });
            newCalendar.save();
            _context9.next = 22;
            break;

          case 19:
            key = "treeArcNodes." + gRes.data.id;
            _context9.next = 22;
            return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
              calendarId: calendarId
            }, {
              "$set": _defineProperty({
                lastEventId: null
              }, key, {
                ArcInfo: arcInfo,
                eventMeta: {
                  attendees: attendees,
                  description: description,
                  dateTime: dateTime,
                  summary: summary,
                  duration: duration
                }
              })
            }).exec());

          case 22:
            return _context9.abrupt("return", gRes);

          case 25:
            _context9.prev = 25;
            _context9.t0 = _context9["catch"](2);
            throw _context9.t0;

          case 28:
          case "end":
            return _context9.stop();
        }
      }
    }, null, null, [[2, 25]]);
  },
  listCalendars: function listCalendars(req, res) {
    var calendar, googleRes, result, calendarId, list;
    return regeneratorRuntime.async(function listCalendars$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context10.next = 3;
            return regeneratorRuntime.awrap(calendar.calendarList.list());

          case 3:
            googleRes = _context10.sent;
            _context10.next = 6;
            return regeneratorRuntime.awrap(UserProfile.findOne({
              email: req.body.userID
            }).exec());

          case 6:
            result = _context10.sent;
            calendarId = result.calendarId || null;
            list = googleRes.data.items.map(function (el) {
              return {
                id: el.id,
                summary: el.summary
              };
            });
            return _context10.abrupt("return", {
              list: list,
              shared: calendarId
            });

          case 10:
          case "end":
            return _context10.stop();
        }
      }
    });
  },

  /**
   * Add Preference, find norm -> day off -> max meetings...
   */
  findNorm: function findNorm(req, res) {
    var _req$body3, participants, organizer, candidateDays, candidateDates, trainingBound, description, preferenceToggle, result, calendarId, data, today, startDate, historyDates, _i4, _historyDates, du, currentEvents, filteredData, timeClasses, kmeans, gRes, _i5, _arr, email;

    return regeneratorRuntime.async(function findNorm$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _req$body3 = req.body, participants = _req$body3.participants, organizer = _req$body3.organizer, candidateDays = _req$body3.candidateDays, candidateDates = _req$body3.candidateDates, trainingBound = _req$body3.trainingBound, description = _req$body3.description, preferenceToggle = _req$body3.preferenceToggle; // find the calendar IDs

            _context11.next = 3;
            return regeneratorRuntime.awrap(UserProfile.findOne({
              email: organizer.email
            }).exec());

          case 3:
            result = _context11.sent;
            calendarId = result.calendarId;
            data = [];
            today = new Date();
            startDate = new Date();
            startDate.setDate(today.getDate() - 14);
            startDate.setHours(23, 59, 59, 999);
            historyDates = [];
            today.setDate(today.getDate() - 1);
            today.setHours(23, 59, 59, 999);

            while (startDate <= today) {
              if (candidateDays.includes('' + startDate.getDay())) {
                historyDates.push(startDate.toISOString());
              }

              startDate.setDate(startDate.getDate() + 1);
            } //get the history data


            _i4 = 0, _historyDates = historyDates;

          case 15:
            if (!(_i4 < _historyDates.length)) {
              _context11.next = 32;
              break;
            }

            date = _historyDates[_i4];
            _context11.prev = 17;
            du = _objectSpread({}, req, {
              body: _objectSpread({}, req.body, {
                calendarId: calendarId,
                date: date
              })
            });
            _context11.next = 21;
            return regeneratorRuntime.awrap(apis.listEvents(du, res));

          case 21:
            currentEvents = _context11.sent;
            data = [].concat(_toConsumableArray(data), _toConsumableArray(currentEvents));
            _context11.next = 29;
            break;

          case 25:
            _context11.prev = 25;
            _context11.t0 = _context11["catch"](17);
            log(_context11.t0);
            throw _context11.t0;

          case 29:
            _i4++;
            _context11.next = 15;
            break;

          case 32:
            data.forEach(function (el) {
              return el.purpose = getPurpose(el.description);
            });
            filteredData = data.filter(function (dp) {
              var attendees = dp.attendees || [];
              var attendeeIds = attendees.map(function (el) {
                return el.email;
              });

              if (dp.purpose === getPurpose(description)) {
                return true;
              }

              if (attendeeIds.some(function (r) {
                return participants.includes(r);
              })) {
                return true;
              }
            });
            timeClasses = ['Morning', 'Afternoon'];
            kmeans = new KMeans(candidateDays, timeClasses, filteredData);

            try {
              kmeans.train();
            } catch (e) {
              log(e);
            }

            gRes = kmeans.predict({
              description: description,
              purpose: getPurpose(description),
              participants: participants
            });

            if (!(preferenceToggle == 0)) {
              _context11.next = 40;
              break;
            }

            return _context11.abrupt("return", {
              calendarId: calendarId,
              res: gRes
            });

          case 40:
            if (!(preferenceToggle == 1)) {
              _context11.next = 52;
              break;
            }

            _context11.prev = 41;
            _context11.next = 44;
            return regeneratorRuntime.awrap(filterByPreference(gRes, req, res, organizer.email, candidateDates, calendarId));

          case 44:
            return _context11.abrupt("return", {
              calendarId: calendarId,
              res: gRes
            });

          case 47:
            _context11.prev = 47;
            _context11.t1 = _context11["catch"](41);
            throw _context11.t1;

          case 50:
            _context11.next = 61;
            break;

          case 52:
            _i5 = 0, _arr = [].concat(_toConsumableArray(participants), [organizer.email]);

          case 53:
            if (!(_i5 < _arr.length)) {
              _context11.next = 60;
              break;
            }

            email = _arr[_i5];
            _context11.next = 57;
            return regeneratorRuntime.awrap(filterByPreference(gRes, req, res, email, candidateDates, calendarId));

          case 57:
            _i5++;
            _context11.next = 53;
            break;

          case 60:
            return _context11.abrupt("return", {
              calendarId: calendarId,
              res: gRes
            });

          case 61:
          case "end":
            return _context11.stop();
        }
      }
    }, null, null, [[17, 25], [41, 47]]);
  },
  watchEvents: function watchEvents(req, res) {
    var calendarId, mmToken, calendar, gRes, calendarWatch, newCalendar;
    return regeneratorRuntime.async(function watchEvents$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            calendarId = req.body.calendarId;
            log("start watching on: " + calendarId);
            _context12.next = 4;
            return regeneratorRuntime.awrap(UserToken.findOne({
              user_id: 'calendarmiddleman@gmail.com'
            }).exec());

          case 4:
            mmToken = _context12.sent;
            oAuth2Client.setCredentials(mmToken);
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context12.next = 9;
            return regeneratorRuntime.awrap(calendar.events.watch({
              calendarId: calendarId,
              requestBody: {
                id: uuidv4(),
                type: "web_hook",
                address: "https://71be990f4d73.ngrok.io/mmAuth/calendar/onChange"
              }
            }));

          case 9:
            gRes = _context12.sent;
            _context12.next = 12;
            return regeneratorRuntime.awrap(CalendarWatch.findOne({
              calendarId: calendarId
            }).exec());

          case 12:
            calendarWatch = _context12.sent;

            if (!calendarWatch) {
              newCalendar = new CalendarWatch({
                calendarId: calendarId,
                channelInfo: gRes.data
              });
              newCalendar.save();
            } else {
              // update watched calendar's channel information
              CalendarWatch.findOneAndUpdate({
                calendarId: calendarId
              }, {
                $set: {
                  channelInfo: gRes.data
                }
              }, function (err, result) {
                if (err) throw err;
                if (!result) throw new Error('not found calendar');
              });
            }

            return _context12.abrupt("return", gRes);

          case 15:
          case "end":
            return _context12.stop();
        }
      }
    });
  },
  stopWatch: function stopWatch(req, res) {
    var channelInfo, mmToken, calendar, gRes;
    return regeneratorRuntime.async(function stopWatch$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            channelInfo = req.body.channelInfo;
            console.log("stop watching on " + channelInfo.id);
            _context13.next = 4;
            return regeneratorRuntime.awrap(UserToken.findOne({
              user_id: 'calendarmiddleman@gmail.com'
            }).exec());

          case 4:
            mmToken = _context13.sent;
            oAuth2Client.setCredentials(mmToken);
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context13.next = 9;
            return regeneratorRuntime.awrap(calendar.channels.stop({
              requestBody: _objectSpread({}, channelInfo)
            }));

          case 9:
            gRes = _context13.sent;
            return _context13.abrupt("return", gRes);

          case 11:
          case "end":
            return _context13.stop();
        }
      }
    });
  },
  findSlot: function findSlot(req, res) {
    var payload, dates, time, idealTimes, duration, user_ids, id_preferences, calendarIds, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, email, result, result2, date_slot, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, _date3, id_events, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, _calendarId, events, curDate, curTime, _MinConflict$Tree_ARC, slot, root, conflicts, tempUUID, curBest, temp, goodTime, end, start, nowEnd;

    return regeneratorRuntime.async(function findSlot$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            payload = req.body.payload;
            dates = payload.dates, time = payload.time, idealTimes = payload.idealTimes, duration = payload.duration, user_ids = payload.user_ids;
            id_preferences = {};
            calendarIds = [];
            _iteratorNormalCompletion3 = true;
            _didIteratorError3 = false;
            _iteratorError3 = undefined;
            _context14.prev = 7;
            _iterator3 = user_ids[Symbol.iterator]();

          case 9:
            if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
              _context14.next = 22;
              break;
            }

            email = _step3.value;
            _context14.next = 13;
            return regeneratorRuntime.awrap(UserPreference.findOne({
              user_id: email
            }).exec());

          case 13:
            result = _context14.sent;
            _context14.next = 16;
            return regeneratorRuntime.awrap(UserProfile.findOne({
              email: email
            }).exec());

          case 16:
            result2 = _context14.sent;

            if (result) {
              id_preferences[result2.calendarId] = result;
            }

            if (result2) {
              calendarIds.push(result2.calendarId);
            }

          case 19:
            _iteratorNormalCompletion3 = true;
            _context14.next = 9;
            break;

          case 22:
            _context14.next = 28;
            break;

          case 24:
            _context14.prev = 24;
            _context14.t0 = _context14["catch"](7);
            _didIteratorError3 = true;
            _iteratorError3 = _context14.t0;

          case 28:
            _context14.prev = 28;
            _context14.prev = 29;

            if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
              _iterator3["return"]();
            }

          case 31:
            _context14.prev = 31;

            if (!_didIteratorError3) {
              _context14.next = 34;
              break;
            }

            throw _iteratorError3;

          case 34:
            return _context14.finish(31);

          case 35:
            return _context14.finish(28);

          case 36:
            date_slot = {};
            _iteratorNormalCompletion4 = true;
            _didIteratorError4 = false;
            _iteratorError4 = undefined;
            _context14.prev = 40;
            _iterator4 = dates[Symbol.iterator]();

          case 42:
            if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
              _context14.next = 84;
              break;
            }

            _date3 = _step4.value;
            id_events = {};
            _iteratorNormalCompletion5 = true;
            _didIteratorError5 = false;
            _iteratorError5 = undefined;
            _context14.prev = 48;
            _iterator5 = calendarIds[Symbol.iterator]();

          case 50:
            if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
              _context14.next = 60;
              break;
            }

            _calendarId = _step5.value;
            req.body = _objectSpread({}, req.body, {
              calendarId: _calendarId,
              date: _date3
            });
            _context14.next = 55;
            return regeneratorRuntime.awrap(apis.listEvents(req, res));

          case 55:
            events = _context14.sent;
            id_events[_calendarId] = events;

          case 57:
            _iteratorNormalCompletion5 = true;
            _context14.next = 50;
            break;

          case 60:
            _context14.next = 66;
            break;

          case 62:
            _context14.prev = 62;
            _context14.t1 = _context14["catch"](48);
            _didIteratorError5 = true;
            _iteratorError5 = _context14.t1;

          case 66:
            _context14.prev = 66;
            _context14.prev = 67;

            if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
              _iterator5["return"]();
            }

          case 69:
            _context14.prev = 69;

            if (!_didIteratorError5) {
              _context14.next = 72;
              break;
            }

            throw _iteratorError5;

          case 72:
            return _context14.finish(69);

          case 73:
            return _context14.finish(66);

          case 74:
            log("calculating best slot");
            curDate = _date3.split("T")[0];
            curTime = {
              meeting_start_time: curDate + "T" + time.meeting_start_time.split("T")[1],
              meeting_end_time: curDate + "T" + time.meeting_end_time.split("T")[1]
            };
            _MinConflict$Tree_ARC = MinConflict.Tree_ARC3(id_events, duration, curTime, id_preferences), slot = _MinConflict$Tree_ARC.slot, root = _MinConflict$Tree_ARC.root, conflicts = _MinConflict$Tree_ARC.conflicts;
            log("done");
            tempUUID = uuidv4();
            date_slot[_date3] = {
              slot: slot,
              uuid: tempUUID,
              conflicts: conflicts,
              time: curTime,
              root: root
            };

          case 81:
            _iteratorNormalCompletion4 = true;
            _context14.next = 42;
            break;

          case 84:
            _context14.next = 90;
            break;

          case 86:
            _context14.prev = 86;
            _context14.t2 = _context14["catch"](40);
            _didIteratorError4 = true;
            _iteratorError4 = _context14.t2;

          case 90:
            _context14.prev = 90;
            _context14.prev = 91;

            if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
              _iterator4["return"]();
            }

          case 93:
            _context14.prev = 93;

            if (!_didIteratorError4) {
              _context14.next = 96;
              break;
            }

            throw _iteratorError4;

          case 96:
            return _context14.finish(93);

          case 97:
            return _context14.finish(90);

          case 98:
            if (idealTimes.length !== 2) {
              (function () {
                var goodTime = idealTimes[0] === 'Morning' ? 1 : 0;

                for (var _i6 = 0, _Object$keys4 = Object.keys(date_slot); _i6 < _Object$keys4.length; _i6++) {
                  var _date2 = _Object$keys4[_i6];
                  var curRes = date_slot[_date2].slot;
                  curRes.forEach(function (timeSlot) {
                    var end = new Date(timeSlot.right).getHours();
                    var start = new Date(timeSlot.left).getHours();

                    if (goodTime && end < 12) {
                      timeSlot.counter -= 60;
                    }

                    if (!goodTime && start > 12) {
                      timeSlot.counter -= 60;
                    }
                  });
                }
              })();
            }

            curBest = Object.values(date_slot).map(function (el) {
              return el;
            });
            curBest = _.orderBy(curBest, ['slot.counter', 'slot.left'], ['asc', 'asc'])[0];
            records[curBest.uuid] = curBest;
            temp = curBest.slot[0];

            if (idealTimes.length !== 2) {
              goodTime = idealTimes[0] === 'Morning' ? 1 : 0;
              end = new Date(temp.right).getHours();
              start = new Date(temp.left).getHours();

              if (end > 12 && start < 12 && !temp.tight) {
                nowEnd = new Date(temp.left);
                nowEnd.setHours(12);

                if (goodTime && (nowEnd.getHours() - new Date(temp.left).getHours()) * 60 >= duration) {
                  temp = {
                    "left": temp.left,
                    "right": nowEnd,
                    "tight": false,
                    "counter": temp.counter,
                    "ids": temp.ids,
                    duration: duration
                  };
                }

                if (!goodTime && (new Date(temp.right).getHours() - nowEnd.getHours()) * 60 >= duration) {
                  temp = {
                    "left": nowEnd,
                    "right": temp.end,
                    "tight": false,
                    "counter": temp.counter,
                    "ids": temp.ids,
                    duration: duration
                  };
                }
              }
            }

            return _context14.abrupt("return", {
              slot: [temp],
              uuid: curBest.uuid
            });

          case 105:
          case "end":
            return _context14.stop();
        }
      }
    }, null, null, [[7, 24, 28, 36], [29,, 31, 35], [40, 86, 90, 98], [48, 62, 66, 74], [67,, 69, 73], [91,, 93, 97]]);
  },
  listEvents: function listEvents(req, res) {
    var _req$body4, calendarId, date, time, calendar, queryTime, queryDate, gRes, calendarWatch, newWatch;

    return regeneratorRuntime.async(function listEvents$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _req$body4 = req.body, calendarId = _req$body4.calendarId, date = _req$body4.date, time = _req$body4.time;
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            queryTime = {};
            queryDate = '';
            queryDate = new Date(date).toISOString().slice(0, 10);

            if (!time) {
              queryTime.timeMin = queryDate + 'T00:00:00.000Z';
              queryTime.timeMax = queryDate + 'T23:59:59.000Z';
            } else {
              queryTime.timeMin = queryDate + time.min;
              queryTime.timeMax = queryDate + time.max;
            }

            _context15.prev = 6;
            _context15.next = 9;
            return regeneratorRuntime.awrap(calendar.events.list({
              calendarId: calendarId,
              timeMin: queryTime.timeMin,
              timeMax: queryTime.timeMax
            }));

          case 9:
            gRes = _context15.sent;
            _context15.next = 12;
            return regeneratorRuntime.awrap(CalendarWatch.findOne({
              calendarId: calendarId
            }).exec());

          case 12:
            calendarWatch = _context15.sent;

            if (calendarWatch) {
              _context15.next = 19;
              break;
            }

            newWatch = new CalendarWatch({
              calendarId: calendarId,
              syncToken: gRes.data.nextSyncToken
            });
            _context15.next = 17;
            return regeneratorRuntime.awrap(newWatch.save());

          case 17:
            _context15.next = 23;
            break;

          case 19:
            _context15.next = 21;
            return regeneratorRuntime.awrap(CalendarWatch.findOneAndUpdate({
              calendarId: calendarId
            }, {
              $set: {
                syncToken: gRes.data.nextSyncToken
              }
            }).exec());

          case 21:
            console.log("syncToken updated!");
            console.log(gRes.data.nextSyncToken);

          case 23:
            return _context15.abrupt("return", gRes.data.items);

          case 26:
            _context15.prev = 26;
            _context15.t0 = _context15["catch"](6);
            throw _context15.t0;

          case 29:
          case "end":
            return _context15.stop();
        }
      }
    }, null, null, [[6, 26]]);
  },
  subscribeCalendar: function subscribeCalendar(req, res) {
    var calendarId, mmToken, calendar, gRes;
    return regeneratorRuntime.async(function subscribeCalendar$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            calendarId = req.body.calendarId;
            log("subscribe calendar " + calendarId);
            _context16.next = 4;
            return regeneratorRuntime.awrap(UserToken.findOne({
              user_id: 'calendarmiddleman@gmail.com'
            }).exec());

          case 4:
            mmToken = _context16.sent;
            oAuth2Client.setCredentials(mmToken);
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context16.next = 9;
            return regeneratorRuntime.awrap(calendar.calendarList.insert({
              requestBody: {
                id: calendarId
              }
            }));

          case 9:
            gRes = _context16.sent;
            return _context16.abrupt("return", gRes.data);

          case 11:
          case "end":
            return _context16.stop();
        }
      }
    });
  },
  getACL: function getACL(req, res) {
    var calendarId, calendar, gRes;
    return regeneratorRuntime.async(function getACL$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            calendarId = req.body.calendarId;
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context17.next = 4;
            return regeneratorRuntime.awrap(calendar.acl.list({
              calendarId: calendarId
            }));

          case 4:
            gRes = _context17.sent;
            return _context17.abrupt("return", gRes.data);

          case 6:
          case "end":
            return _context17.stop();
        }
      }
    });
  },
  listACL: function listACL(req, res) {
    var calendarId, calendar, gRes;
    return regeneratorRuntime.async(function listACL$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            calendarId = req.body.calendarId;
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context18.next = 4;
            return regeneratorRuntime.awrap(calendar.acl.list({
              calendarId: calendarId
            }));

          case 4:
            gRes = _context18.sent;
            return _context18.abrupt("return", gRes);

          case 6:
          case "end":
            return _context18.stop();
        }
      }
    });
  },
  removeACL: function removeACL(req, res) {
    var calendarId, calendar, gRes, listOfRules, ruleId;
    return regeneratorRuntime.async(function removeACL$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            calendarId = req.body.calendarId;
            log("revoking mm access from " + calendarId);
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context19.next = 5;
            return regeneratorRuntime.awrap(calendar.acl.list({
              calendarId: calendarId
            }));

          case 5:
            gRes = _context19.sent;
            listOfRules = gRes.data.items;
            ruleId = listOfRules.find(function (el) {
              return el.scope.value === 'calendarmiddleman@gmail.com';
            });

            if (!ruleId) {
              _context19.next = 12;
              break;
            }

            _context19.next = 11;
            return regeneratorRuntime.awrap(calendar.acl["delete"]({
              ruleId: ruleId.id,
              calendarId: calendarId
            }));

          case 11:
            gRes = _context19.sent;

          case 12:
            return _context19.abrupt("return", gRes);

          case 13:
          case "end":
            return _context19.stop();
        }
      }
    });
  },
  shareCalendar: function shareCalendar(req, res) {
    var _req$body5, calendarId, userID, calendar, userProfile, previousCalendarId, calendarProfile;

    return regeneratorRuntime.async(function shareCalendar$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            _req$body5 = req.body, calendarId = _req$body5.calendarId, userID = _req$body5.userID;
            calendar = google.calendar({
              version: 'v3',
              auth: oAuth2Client
            });
            _context20.prev = 2;
            _context20.next = 5;
            return regeneratorRuntime.awrap(UserProfile.findOne({
              email: userID
            }).exec());

          case 5:
            userProfile = _context20.sent;
            previousCalendarId = userProfile.calendarId; // remove MM from previously shared calendar *User*

            if (!previousCalendarId) {
              _context20.next = 10;
              break;
            }

            _context20.next = 10;
            return regeneratorRuntime.awrap(apis.removeACL(_objectSpread({}, req, {
              body: _objectSpread({}, req.body, {
                calendarId: previousCalendarId
              })
            }), res));

          case 10:
            _context20.next = 12;
            return regeneratorRuntime.awrap(calendar.acl.insert({
              calendarId: calendarId,
              sendNotifications: true,
              requestBody: {
                role: "owner",
                scope: {
                  type: "user",
                  value: "calendarmiddleman@gmail.com"
                }
              }
            }));

          case 12:
            _context20.next = 14;
            return regeneratorRuntime.awrap(CalendarWatch.findOne({
              calendarId: previousCalendarId
            }).exec());

          case 14:
            calendarProfile = _context20.sent;

            if (!(previousCalendarId && calendarProfile && calendarProfile.channelInfo)) {
              _context20.next = 18;
              break;
            }

            _context20.next = 18;
            return regeneratorRuntime.awrap(apis.stopWatch(_objectSpread({}, req, {
              body: _objectSpread({}, req.body, {
                channelInfo: calendarProfile.channelInfo,
                calendarId: calendarId
              })
            }), res));

          case 18:
            UserProfile.findOneAndUpdate({
              email: userID
            }, {
              $set: {
                calendarId: calendarId
              }
            }, function (err, result) {
              if (err) throw err;
              if (!result) throw new Error('not found calendar');
              return 1;
            });
            _context20.next = 21;
            return regeneratorRuntime.awrap(apis.subscribeCalendar(req, res));

          case 21:
            _context20.next = 23;
            return regeneratorRuntime.awrap(apis.watchEvents(req, res));

          case 23:
            _context20.next = 28;
            break;

          case 25:
            _context20.prev = 25;
            _context20.t0 = _context20["catch"](2);
            throw _context20.t0;

          case 28:
          case "end":
            return _context20.stop();
        }
      }
    }, null, null, [[2, 25]]);
  }
};

var calendarAPIs = function calendarAPIs(app) {
  app.use("/auth/", auth);
  app.use("/mmAuth/", mmAuth);
  app.post("/mmAuth/calendar/stopWatch", function _callee5(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee5$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            log("stop watching...");
            _context21.next = 3;
            return regeneratorRuntime.awrap(apis.stopWatch(req, res));

          case 3:
            gRes = _context21.sent;
            res.status(200).send(gRes);

          case 5:
          case "end":
            return _context21.stop();
        }
      }
    });
  });
  app.post("/auth/calendar/stopWatch", function _callee6(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee6$(_context22) {
      while (1) {
        switch (_context22.prev = _context22.next) {
          case 0:
            log("stop watching...");
            _context22.next = 3;
            return regeneratorRuntime.awrap(apis.stopWatch(req, res));

          case 3:
            gRes = _context22.sent;
            res.status(200).send(gRes);

          case 5:
          case "end":
            return _context22.stop();
        }
      }
    });
  });
  app.post("/auth/calendar/list", function _callee7(req, res) {
    var parsed;
    return regeneratorRuntime.async(function _callee7$(_context23) {
      while (1) {
        switch (_context23.prev = _context23.next) {
          case 0:
            log("list all calendars");
            _context23.prev = 1;
            _context23.next = 4;
            return regeneratorRuntime.awrap(apis.listCalendars(req, res));

          case 4:
            parsed = _context23.sent;
            res.status(200).send({
              data: parsed
            });
            _context23.next = 11;
            break;

          case 8:
            _context23.prev = 8;
            _context23.t0 = _context23["catch"](1);
            res.status(500).send(_context23.t0);

          case 11:
          case "end":
            return _context23.stop();
        }
      }
    }, null, null, [[1, 8]]);
  }); // {
  //   "payload": {
  //     "dates": ["2021-06-23T05:46:40.082Z"],
  //     "times": ["Morning", "Afternoon"],
  //     "duration": "2",
  //     "calendarIds": ["ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com"],
  //     "time": {
  //       "meeting_start_time": "2021-06-23T15:00:00.000Z",
  //       "meeting_end_time": "2021-06-23T22:00:00.000Z"
  //     }
  //   }
  // }

  app.post("/mmAuth/calendar/findSlot", function _callee8(req, res) {
    var slot;
    return regeneratorRuntime.async(function _callee8$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            log("find slots"); // try {

            _context24.next = 3;
            return regeneratorRuntime.awrap(apis.findSlot(req, res));

          case 3:
            slot = _context24.sent;
            res.status(200).send(slot); // } catch (e) {
            //   res.status(500).send(e);
            // }

          case 5:
          case "end":
            return _context24.stop();
        }
      }
    });
  });
  app.post("/mmAuth/calendar/onChange", function _callee9(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee9$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            console.log("in on change");
            console.error(req.headers['x-goog-channel-id']);
            console.error(req.headers['x-goog-resource-id']);
            _context25.prev = 3;
            _context25.next = 6;
            return regeneratorRuntime.awrap(apis.onChange(req, res));

          case 6:
            gRes = _context25.sent;
            res.status(200).send(gRes);
            _context25.next = 13;
            break;

          case 10:
            _context25.prev = 10;
            _context25.t0 = _context25["catch"](3);
            res.status(500).send(_context25.t0);

          case 13:
          case "end":
            return _context25.stop();
        }
      }
    }, null, null, [[3, 10]]);
  });
  app.post("/mmAuth/calendar/watch", function _callee10(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee10$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            _context26.prev = 0;
            _context26.next = 3;
            return regeneratorRuntime.awrap(apis.watchEvents(req, res));

          case 3:
            gRes = _context26.sent;
            res.status(200).send(gRes);
            _context26.next = 10;
            break;

          case 7:
            _context26.prev = 7;
            _context26.t0 = _context26["catch"](0);
            res.status(500).send(_context26.t0);

          case 10:
          case "end":
            return _context26.stop();
        }
      }
    }, null, null, [[0, 7]]);
  }); // {
  // 	"calendarId": "ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com",
  // 	"attendees": ["yiyang97728@gmail.com"],
  // 	"description":"I want to chat with yiyang",
  // 	"dateTime": {
  // 		"start": "2021-06-24T17:00:00.000Z",
  // 		"end": "2021-06-24T19:00:00.000Z"
  // 	},
  // 	"summary": "new meeting pushed by calendar"
  // }

  app.post("/mmAuth/calendar/pushCalendar", function _callee11(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee11$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            log("push to google calendar"); // try {

            _context27.next = 3;
            return regeneratorRuntime.awrap(apis.pushCalendar(req, res));

          case 3:
            gRes = _context27.sent;
            res.status(200).send(gRes); // } catch (e) {
            //   res.status(500).send(e);
            // }

          case 5:
          case "end":
            return _context27.stop();
        }
      }
    });
  });
  app.post("/mmAuth/calendar/getUserEmail", function _callee12(req, res) {
    return regeneratorRuntime.async(function _callee12$(_context28) {
      while (1) {
        switch (_context28.prev = _context28.next) {
          case 0:
            log("get user email");

          case 1:
          case "end":
            return _context28.stop();
        }
      }
    });
  });
  app.post("/mmAuth/calendar/subscribeCalendar", function _callee13(req, res) {
    return regeneratorRuntime.async(function _callee13$(_context29) {
      while (1) {
        switch (_context29.prev = _context29.next) {
          case 0:
            _context29.prev = 0;
            _context29.next = 3;
            return regeneratorRuntime.awrap(apis.subscribeCalendar(req, res));

          case 3:
            res.status(200).send('successful');
            _context29.next = 9;
            break;

          case 6:
            _context29.prev = 6;
            _context29.t0 = _context29["catch"](0);
            res.status(500).send(_context29.t0);

          case 9:
          case "end":
            return _context29.stop();
        }
      }
    }, null, null, [[0, 6]]);
  });
  /**
   * {
      "participants": ["yiyang97728@gmail.com"],
      "organizer": {
        "email": "yyian97728@gmail.com", "name": "yy"},
      "candidateDays": ["0", "1", "2", "3", "4", "5", "6"],
      "trainingBound": "2021-06-20T10:05:01.284Z",
      "purpose": "social"
    }
   */

  app.post("/mmAuth/calendar/findNorm", function _callee14(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee14$(_context30) {
      while (1) {
        switch (_context30.prev = _context30.next) {
          case 0:
            log("find norm");
            _context30.prev = 1;
            _context30.next = 4;
            return regeneratorRuntime.awrap(apis.findNorm(req, res));

          case 4:
            gRes = _context30.sent;
            res.status(200).send(gRes);
            _context30.next = 11;
            break;

          case 8:
            _context30.prev = 8;
            _context30.t0 = _context30["catch"](1);
            res.status(500).send(_context30.t0);

          case 11:
          case "end":
            return _context30.stop();
        }
      }
    }, null, null, [[1, 8]]);
  }); // "date": "2021-06-23T13:00:00.00Z",
  // "calendarId": "ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com"

  app.post("/mmAuth/calendar/listEvents", function _callee15(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee15$(_context31) {
      while (1) {
        switch (_context31.prev = _context31.next) {
          case 0:
            log("list events");
            _context31.prev = 1;
            _context31.next = 4;
            return regeneratorRuntime.awrap(apis.listEvents(req, res));

          case 4:
            gRes = _context31.sent;
            console.error("list response is: ");
            log(gRes);
            res.status(200).send(gRes);
            _context31.next = 13;
            break;

          case 10:
            _context31.prev = 10;
            _context31.t0 = _context31["catch"](1);
            res.status(500).send(_context31.t0);

          case 13:
          case "end":
            return _context31.stop();
        }
      }
    }, null, null, [[1, 10]]);
  });
  app.post("/auth/calendar/getACL", function _callee16(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee16$(_context32) {
      while (1) {
        switch (_context32.prev = _context32.next) {
          case 0:
            log("get acl");
            _context32.next = 3;
            return regeneratorRuntime.awrap(apis.getACL(req, res));

          case 3:
            gRes = _context32.sent;
            res.status(200).json(gRes);

          case 5:
          case "end":
            return _context32.stop();
        }
      }
    });
  });
  app.post("/auth/calendar/listACL", function _callee17(req, res) {
    var gRes;
    return regeneratorRuntime.async(function _callee17$(_context33) {
      while (1) {
        switch (_context33.prev = _context33.next) {
          case 0:
            log("list acl");
            _context33.next = 3;
            return regeneratorRuntime.awrap(apis.listACL(req, res));

          case 3:
            gRes = _context33.sent;
            res.status(200).json(gRes);

          case 5:
          case "end":
            return _context33.stop();
        }
      }
    });
  }); // "userLoginToken": "",
  // "calendars": [{
  //       "id": "yiyang97728@gmail.com",
  //       "summary": "yiyang97728@gmail.com"
  //   }]

  app.post("/auth/calendar/shareCalendar", function _callee18(req, res) {
    return regeneratorRuntime.async(function _callee18$(_context34) {
      while (1) {
        switch (_context34.prev = _context34.next) {
          case 0:
            log("share calendar"); // try {

            _context34.next = 3;
            return regeneratorRuntime.awrap(apis.shareCalendar(req, res));

          case 3:
            res.status(200).send('successful'); // } catch (e) { res.status(500).send(e) };

          case 4:
          case "end":
            return _context34.stop();
        }
      }
    });
  });
  app.post("/auth/calendar/removeAccess", function _callee19(req, res) {
    return regeneratorRuntime.async(function _callee19$(_context35) {
      while (1) {
        switch (_context35.prev = _context35.next) {
          case 0:
            log("remove calendar access from middleman");
            _context35.prev = 1;
            _context35.next = 4;
            return regeneratorRuntime.awrap(apis.removeACL(req, res));

          case 4:
            res.status(200).send('successful');
            _context35.next = 10;
            break;

          case 7:
            _context35.prev = 7;
            _context35.t0 = _context35["catch"](1);
            res.status(500).send(_context35.t0);

          case 10:
            ;

          case 11:
          case "end":
            return _context35.stop();
        }
      }
    }, null, null, [[1, 7]]);
  });
};

module.exports = calendarAPIs;