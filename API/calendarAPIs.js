const host = "https://71be990f4d73.ngrok.io";
const { google } = require('googleapis');
const MinConflict = require('../utils/min');
const UserToken = require("../models/userToken.model");
const UserProfile = require("../models/userProfile.model");
const UserPreference = require("../models/userPreference.model");
const CalendarWatch = require("../models/calendar.model");
const axios = require('axios');

const fs = require('fs');
const colors = require("colors/safe");
const _ = require('lodash');
const KMeans = require('../utils/knn');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const records = {};

class Node {
  constructor(_left, _right, _counter, _payload) {
    this.left = _left;
    this.right = _right;
    this.counter = _counter;
    this.child = null;
    this.next = null;
    this.events = _payload;
  }
}

let oAuth2Client;
let globalCredentials;
let initOAuth = () => {
  fs.readFile(path.join(__dirname, '../credentials.json'), async (err, content) => {
    if (err) {
      log('Error loading client secret file:', err);
      return;
    };
    const credentials = JSON.parse(content);

    globalCredentials = credentials.web;
    oAuth2Client = new google.auth.OAuth2(
      globalCredentials.client_id, globalCredentials.client_secret, globalCredentials.redirect_uris[0]);
  });
};
initOAuth();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.profile'
];

function log(text) {
  console.log(`${colors.blue("[calendarAPI]")} ${text}`);
}

const purposes = ['social', 'chat', 'work', 'normal'];

function getPurpose(description) {
  if (!description) return 'normal';
  for (let purpose of purposes) {
    if (description.includes(purpose)) return purpose;
  }
  return 'normal';
}

async function filterByPreference(gRes, req, res, user_id, candidateDates, calendarId) {
  try {
    const userPreference = await UserPreference.findOne({ user_id });
    // get day_off
    userPreference.day_off.forEach(dayOff => {
      if (Object.keys(gRes.day).includes(dayOff)) {
        gRes.day[dayOff] += 100;
      }
    });
    //get max_meeting
    for (let date of candidateDates) {
      req.body = {
        ...req.body,
        calendarId,
        date,
      }
      const currentEvents = await apis.listEvents(req, res);
      if (currentEvents.length + 1 > userPreference.max_meeting) {
        const curDay = new Date(date);
        gRes.day['' + curDay.getDay()] += 100;
      }
    }
  } catch (e) { throw e }
}

async function mmAuth(req, res, next) {
  UserToken.find({ user_id: 'calendarmiddleman@gmail.com' }, (err, mmToken) => {
    if (err) {
      res.status(500).send('err in db');
    }
    if (mmToken.length === 1) {
      oAuth2Client.setCredentials(mmToken[0]);
      next();
    } else res.status(500).send('mm token missing')
  });
}
async function auth(req, res, next) {
  const { userLoginToken, code } = req.body;
  if (!userLoginToken) { res.status(400).send('login required') }
  let userID;
  try {
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: userLoginToken,
      audience: globalCredentials.client_id,
    });
    const payload = ticket.getPayload();
    UserProfile.find({ email: payload['email'] }, async (err, result) => {
      if (err) {
        log("db error")
        throw (err)
      }
      if (result.length > 1) {
        throw new Error('multiple user with same email');
      }
      if (result.length === 0) {
        const newProfile = new UserProfile({ ...payload, calendarId: null });
        newProfile.save().then().catch(e => {
          throw (e);
        });
      }
      userID = payload['email'];

      UserToken.find({ user_id: userID }, (error, result) => {
        if (error) {
          res.status(500).json(error);
        }
        if (result.length === 0) {
          if (!!code) {
            oAuth2Client.getToken(code, (err, token) => {
              if (err) {
                res.status(500).send('Error retrieving access token');
              } else {
                log("request token credentials from google");
                oAuth2Client.setCredentials(token);
                const newToken = new UserToken({ user_id: userID, ...token });
                newToken.save()
                  .then(() => {
                    req.body = {
                      ...req.body,
                      // oAuth2Client,
                      userID
                    };
                    next()
                  })
                  .catch(error => {
                    res.status(500).json(error)
                  });
              }
            });
          } else {
            log("token not found, request new token");
            const authUrl = oAuth2Client.generateAuthUrl({
              access_type: 'offline',
              scope: SCOPES,
            });
            res.status(200).send({ type: "authUrl", authUrl });
          }
        }
        else if (result.length === 1) {
          oAuth2Client.setCredentials(result[0]);
          req.body = {
            ...req.body,
            userID,
          };
          next();
        } else {
          res.status(500).send("multiple tokens found!")
        }
      });
    });
  } catch (e) {
    log(e);
    res.status(500).send(e);
  }

}

const apis = {
  onChange: _.debounce(async (req, res) => {
    log("in debounced onchange");
    const { 'x-goog-channel-id': channelId, 'x-goog-resource-id': resourceId, 'x-goog-resource-state': state } = req.headers;
    if (state === 'sync') {
      console.log("now in sync， ignored");
      return;
    }
    const calendarWatch = await CalendarWatch.findOne({ "channelInfo.id": channelId }).exec();
    if (!calendarWatch) {
      log("No Calendar Watch info found!");
      return;
    }
    const calendarId = calendarWatch.calendarId;
    const { treeArcNodes } = calendarWatch;
    if (!Object.keys(treeArcNodes || {}).length) {
      log("calendar is not in any meeting, stopped");
      return;
    }
    const mmToken = await UserToken.findOne({ user_id: 'calendarmiddleman@gmail.com' }).exec();
    oAuth2Client.setCredentials(mmToken);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    if (!calendarWatch.syncToken) {
      log("No Sync Token, stopped");
      return;
    }
    const gRes = await calendar.events.list({
      calendarId,
      syncToken: calendarWatch.syncToken
    });
    await CalendarWatch.findOneAndUpdate({ calendarId },
      { $set: { syncToken: gRes.data.nextSyncToken } }).exec();

    const items = gRes.data.items || [];
    console.log("changed items: ");
    console.log(items);
    let deletedEvents = (await Promise.all(items.map(async (el) => {
      if (el.status === 'cancelled') {
        const res = await calendar.events.get({ calendarId, eventId: el.id });
        return res.data;
      }
    }))).filter(el => !!el);

    let newEvents = items.filter((el) => {
      return (el || {}).status === 'confirmed';
    });
    if (!deletedEvents.length) {
      log("No deleted events");
    }
    if (!newEvents.length) {
      log("No new added events");
    }
    if (!deletedEvents.length && !newEvents.length) { return; }
    if (!deletedEvents.length === 1 || !newEvents.length === 1) {
      log("multiple events got updated at once! stopped");
      return;
    }
    if (deletedEvents.length > 0 && newEvents.length > 0) {
      log("adding and deleting happended at the same time! stopped! ");
      return;
    }

    // Moved Event
    const newEvent = newEvents[0];
    // if (newEvent && newEvent.id === calendarWatch.lastEventId) {

    if (newEvent) {
      log("in moved event");
      const key = "treeArcNodes." + newEvent.id + ".eventMeta.dateTime";
      // update the database for moved event's start and end time
      await CalendarWatch.updateMany({ calendarId }, {
        "$set": {
          [key]: { start: newEvent.start.dateTime, end: newEvent.end.dateTime }
        }
      }).exec();

      for (let eventId of Object.keys(treeArcNodes)) {
        log("eventId: " + eventId);
        if (eventId === newEvent.id) { continue; }
        const { ArcInfo, eventMeta } = treeArcNodes[eventId];
        if (!ArcInfo || !eventMeta) {
          log("no data stored!");
          continue;
        }

        let conflicts = [];
        if (ArcInfo.conflicts.map(el => el.id).includes(`event:${calendarId}:${newEvent.id}`)) {
          conflicts = ArcInfo.conflicts.map(el => {
            if (el.id === `event:${calendarId}:${newEvent.id}`) {
              return {
                ...el,
                left: newEvent.start.dateTime,
                right: newEvent.end.dateTime,
              }
            }
            return el;
          });

        } else {
          conflicts = [...ArcInfo.conflicts, {
            "type": "event",
            "id": `event:${calendarId}:${newEvent.id}`,
            "left": new Date(newEvent.start.dateTime),
            "right": new Date(newEvent.end.dateTime),
            "counter": 1

          }]
        }
        console.log(conflicts);
        if (!conflicts.length) {
          log("conflict array is empty");
          continue;
        };
        conflicts = _.orderBy(conflicts, ['left', 'right'], ['asc', 'desc']);
        const root = new Node(conflicts[0].left, conflicts[0].right, conflicts[0].counter, [conflicts[0].id]);
        conflicts.slice(1).forEach(conflict => {
          MinConflict.recursiveBuildTree(root, conflict);
        });
        const ans = MinConflict.bestSlot(root, { time: ArcInfo.time, duration: eventMeta.duration });
        const curBest = (_.orderBy(ans, ['counter', 'left'], ['asc', 'asc']))[0];

        console.log(curBest);
        // change current event's time and push to google calendar
        const endDate = moment(curBest.left)
          .add(parseInt(curBest.duration), "m")
          .toDate().toISOString();
        if (new Date(curBest.left).getTime() == new Date(eventMeta.dateTime.start).getTime()) {
          console.log(curBest.left);
          console.log(eventMeta.dateTime.start);
          log("end of loop!");
          await CalendarWatch.findOneAndUpdate({ calendarId },
            {
              "$set": {
                lastEventId: null,
              }
            }).exec();
          continue;
        }

        await calendar.events.patch({
          calendarId,
          eventId,
          requestBody: {
            start: { dateTime: curBest.left },
            end: { dateTime: endDate }
          }
        });

        const key = "treeArcNodes." + eventId;
        await CalendarWatch.findOneAndUpdate({ calendarId }, {
          "$set": {
            lastEventId: eventId,
            [key]: {
              ArcInfo: {
                ...ArcInfo,
                slot: ans,
                conflicts,
                root,
              },
              eventMeta: {
                ...eventMeta,
                dateTime: {
                  "start": curBest.left,
                  "end": endDate
                }
              }
            }
          }
        });
        return;
      }
    } else {
      log("newly created event, does not modify");
    }

    // Deleted Event
    const deletedEvent = deletedEvents[0];
    if (!deletedEvent) {
      log("no deleted event, stopped");
      return;
    }
    const deletedID = deletedEvent.id;
    const key = "treeArcNodes." + deletedEvent.id;

    //remove the event itself
    await CalendarWatch.updateMany({}, { $unset: { [key]: 1 } }).exec();
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
    for (let eventId of Object.keys(treeArcNodes)) {
      if (eventId === deletedEvent.id) { continue; }
      const { ArcInfo, eventMeta } = treeArcNodes[eventId];
      if (!ArcInfo) continue;
      const { clean, root, conflicts, notModified } = MinConflict.releasingConstraint(
        `event:${calendarId}:${deletedID}`,
        ArcInfo);
      const key = "treeArcNodes." + eventId;

      // if we are removing the last conflict
      if (clean) {
        const endDate = moment(ArcInfo.time.meeting_start_time)
          .add(parseInt(eventMeta.duration), "m")
          .toDate().toISOString();
        await CalendarWatch.findOneAndUpdate({ calendarId },
          {
            "$set": {
              lastEventId: eventId,
              [key]: {
                ArcInfo: {
                  slot: {
                    "left": ArcInfo.time.meeting_start_time,
                    "right": ArcInfo.time.meeting_end_time,
                    "counter": 0,
                    "tight": false,
                    "ids": [],
                    "duration": eventMeta.duration
                  },
                  conflicts: [], uuid: ArcInfo.uuid, time: ArcInfo.time, root: null
                },
                eventMeta: {
                  ...eventMeta,
                  dateTime: {
                    "start": ArcInfo.time.meeting_start_time,
                    "end": endDate
                  },
                }
              }
            }
          }).exec();
        // change time
        await calendar.events.patch({
          calendarId,
          eventId,
          requestBody: {
            start: { dateTime: ArcInfo.time.meeting_start_time },
            end: { dateTime: endDate }
          }
        });
        log("re-scheduled!");
        return;
      }
      // if we the previous slot is already ideal
      else if (!root) {
        log("current has the best slot, do not modify");
        continue;
      }
      // if the deleted event is not a constraint of the current event
      else if (notModified) {
        log("deleted event does not affect current scheduled events");
        continue;
      }

      const ans = MinConflict.bestSlot(root, {
        duration: eventMeta.duration,
        time: ArcInfo.time,
      });
      const curBest = (_.orderBy(ans, ['slot.counter', 'slot.left'], ['asc', 'asc']))[0];
      console.log("new best slot is: ");
      console.log(curBest);

      const endDate = moment(curBest.left)
        .add(parseInt(curBest.duration), "m")
        .toDate().toISOString();
      await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          start: { dateTime: curBest.left },
          end: { dateTime: endDate }
        }
      });
      await CalendarWatch.findOneAndUpdate({ calendarId },
        {
          "$set": {
            lastEventId: eventId,
            [key]: {
              ArcInfo: {
                slot: curBest,
                conflicts,
                uuid: ArcInfo.uuid,
                time: ArcInfo.time,
                root
              },
              eventMeta: {
                ...eventMeta,
                dateTime: {
                  "start": curBest.left,
                  "end": endDate
                },
              }
            }
          }
        }).exec();
      log("re-scheduled!");
      break;
    }

    // delete the id from others conflicts
    for (let eventId of Object.keys(treeArcNodes)) {
      const key = "treeArcNodes." + eventId + '.ArcInfo.conflicts';
      const { ArcInfo } = treeArcNodes[eventId];
      if (!ArcInfo) continue;
      const newConflicts = ArcInfo.conflicts.filter(el => {
        if (el.id === `event:${calendarId}:${deletedID}`) {
          return false;
        }
        return true;
      });
      await CalendarWatch.findOneAndUpdate({ calendarId },
        {
          "$set": {
            [key]: newConflicts
          }
        }).exec();
    }
  }, 5000),
  pushCalendar: async (req, res) => {
    const { calendarId, attendees, description, dateTime, summary, uuid, duration } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    try {
      const gRes = await calendar.events.insert({
        calendarId,
        sendUpdates: "all",
        sendNotifications: true,
        requestBody: {
          attendees: attendees.map(attendee => ({ email: attendee, responseStatus: "needsAction" })),
          description,
          start: { dateTime: new Date(dateTime.start).toISOString() },
          end: { dateTime: new Date(dateTime.end).toISOString() },
          summary,
        }
      });

      // update the eventId
      const calendarWatch = await CalendarWatch.findOne({ calendarId }).exec();
      if (!uuid) throw new Error("No UUID for ARC nodes");
      // const arcInfo = await ARCInfo.findOne({ uuid }).exec();
      const arcInfo = records[uuid];
      if (!arcInfo) throw new Error("No info for ARC nodes");

      if (!calendarWatch) {
        const newCalendar = new CalendarWatch({
          calendarId,
          lastEventId: null,
          treeArcNodes: {
            [gRes.data.id]: { ArcInfo: arcInfo, eventMeta: { attendees, description, dateTime, summary, duration } }
          }
        });
        newCalendar.save();
      } else {
        const key = "treeArcNodes." + gRes.data.id;
        await CalendarWatch.findOneAndUpdate({ calendarId },
          {
            "$set": {
              lastEventId: null,
              [key]: {
                ArcInfo: arcInfo,
                eventMeta: { attendees, description, dateTime, summary, duration }
              }
            }
          }).exec();
      }
      return gRes;
    } catch (e) {
      throw e;
    }
  },
  listCalendars: async (req, res) => {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const googleRes = await calendar.calendarList.list();
    const result = await UserProfile.findOne({ email: req.body.userID }).exec();
    const calendarId = result.calendarId || null;
    const list = googleRes.data.items.map(el => ({ id: el.id, summary: el.summary }));
    return { list, shared: calendarId }
  },
  /**
   * Add Preference, find norm -> day off -> max meetings...
   */
  findNorm: async (req, res) => {
    const {
      participants,
      organizer,
      candidateDays, //[0,1,2,3,4,5,6]
      candidateDates,
      trainingBound,
      description,
      preferenceToggle,
    } = req.body;
    // find the calendar IDs
    const result = await UserProfile.findOne({ email: organizer.email }).exec();
    const calendarId = result.calendarId;

    let data = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 14);
    startDate.setHours(23, 59, 59, 999);
    const historyDates = [];
    today.setDate(today.getDate() - 1);
    today.setHours(23, 59, 59, 999);

    while (startDate <= today) {
      if (candidateDays.includes('' + startDate.getDay())) {
        historyDates.push(startDate.toISOString());
      }
      startDate.setDate(startDate.getDate() + 1);
    }
    //get the history data
    for (date of historyDates) {
      try {
        const du = {
          ...req,
          body: {
            ...req.body,
            calendarId,
            date,
          }
        }
        const currentEvents = await apis.listEvents(du, res);
        data = [...data, ...currentEvents];
      } catch (e) {
        log(e);
        throw e;
      }
    }

    data.forEach(el => el.purpose = getPurpose(el.description));

    const filteredData = data.filter(dp => {
      const attendees = dp.attendees || [];
      const attendeeIds = attendees.map(el => el.email);

      if (dp.purpose === getPurpose(description)) {
        return true;
      }
      if (attendeeIds.some(r => participants.includes(r))) {
        return true;
      }
    });
    const timeClasses = ['Morning', 'Afternoon'];
    const kmeans = new KMeans(candidateDays, timeClasses, filteredData);
    try {
      kmeans.train();
    } catch (e) {
      log(e);
    }

    const gRes = kmeans.predict({
      description,
      purpose: getPurpose(description),
      participants,
    });
    if (preferenceToggle == 0) { // do not consider preference
      return {
        calendarId,
        res: gRes,
      };
    }
    if (preferenceToggle == 1) { // only consider organizer's preference
      try {
        await filterByPreference(gRes, req, res, organizer.email, candidateDates, calendarId);
        return {
          calendarId,
          res: gRes,
        };
      } catch (e) { throw e }
    } else { // conside all participants preferences...
      for (let email of [...participants, organizer.email]) {
        await filterByPreference(gRes, req, res, email, candidateDates, calendarId);
      }
      return {
        calendarId,
        res: gRes,
      }
    }

  },
  watchEvents: async (req, res) => {
    const { calendarId } = req.body;
    log("start watching on: " + calendarId);
    const mmToken = await UserToken.findOne({ user_id: 'calendarmiddleman@gmail.com' }).exec();
    oAuth2Client.setCredentials(mmToken);
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const gRes = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: uuidv4(),
        type: "web_hook",
        address: "https://71be990f4d73.ngrok.io/mmAuth/calendar/onChange"
      }
    });
    const calendarWatch = await CalendarWatch.findOne({ calendarId }).exec();
    if (!calendarWatch) {
      const newCalendar = new CalendarWatch({
        calendarId,
        channelInfo: gRes.data
      });
      newCalendar.save();
    } else {
      // update watched calendar's channel information
      CalendarWatch.findOneAndUpdate({ calendarId },
        { $set: { channelInfo: gRes.data } },
        (err, result) => {
          if (err) throw err;
          if (!result) throw new Error('not found calendar');
        });
    }

    return gRes;
  },
  stopWatch: async (req, res) => {
    const { channelInfo } = req.body;
    console.log("stop watching on " + channelInfo.id);
    const mmToken = await UserToken.findOne({ user_id: 'calendarmiddleman@gmail.com' }).exec();
    oAuth2Client.setCredentials(mmToken);
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const gRes = await calendar.channels.stop({
      requestBody: {
        ...channelInfo
      }
    });

    return gRes;
  },
  findSlot: async (req, res) => {
    const { payload } = req.body;
    const { dates, time, idealTimes, duration, user_ids } = payload;

    const id_preferences = {};
    const calendarIds = [];
    for (let email of user_ids) {
      const result = await UserPreference.findOne({ user_id: email }).exec();
      const result2 = await UserProfile.findOne({ email }).exec();
      if (result) {
        id_preferences[result2.calendarId] = result;
      }
      if (result2) {
        calendarIds.push(result2.calendarId);
      }
    }

    const date_slot = {};
    for (let date of dates) {
      const id_events = {};
      for (let calendarId of calendarIds) {
        req.body = {
          ...req.body,
          calendarId,
          date,
        }
        const events = await apis.listEvents(req, res);
        id_events[calendarId] = events;
      }
      log("calculating best slot");
      const curDate = date.split("T")[0];
      const curTime = {
        meeting_start_time: curDate + "T" + time.meeting_start_time.split("T")[1],
        meeting_end_time: curDate + "T" + time.meeting_end_time.split("T")[1],
      };
      const { slot, root, conflicts } = MinConflict.Tree_ARC3(id_events, duration, curTime, id_preferences);
      log("done");
      const tempUUID = uuidv4();
      date_slot[date] = {
        slot,
        uuid: tempUUID,
        conflicts, time: curTime, root
      };
    }
    if (idealTimes.length !== 2) {
      const goodTime = idealTimes[0] === 'Morning' ? 1 : 0;
      for (let date of Object.keys(date_slot)) {
        const curRes = date_slot[date].slot;
        curRes.forEach(timeSlot => {
          const end = new Date(timeSlot.right).getHours();
          const start = new Date(timeSlot.left).getHours();
          if (goodTime && end < 12) {
            timeSlot.counter -= 60;
          }
          if (!goodTime && start > 12) {
            timeSlot.counter -= 60;
          }
        })
      }
    }
    let curBest = Object.values(date_slot).map(el => el);

    curBest = (_.orderBy(curBest, ['slot.counter', 'slot.left'], ['asc', 'asc']))[0];
    records[curBest.uuid] = curBest;
    let temp = curBest.slot[0];
    if (idealTimes.length !== 2) {
      const goodTime = idealTimes[0] === 'Morning' ? 1 : 0;
      const end = new Date(temp.right).getHours();
      const start = new Date(temp.left).getHours();
      if (end > 12 && start < 12 && !temp.tight) {
        const nowEnd = new Date(temp.left);
        nowEnd.setHours(12);
        if (goodTime && ((nowEnd.getHours() - new Date(temp.left).getHours()) * 60 >= duration)) {
          temp = {
            "left": temp.left,
            "right": nowEnd,
            "tight": false,
            "counter": temp.counter,
            "ids": temp.ids,
            duration
          }
        }

        if (!goodTime && ((new Date(temp.right).getHours() - nowEnd.getHours()) * 60 >= duration)) {
          temp = {
            "left": nowEnd,
            "right": temp.end,
            "tight": false,
            "counter": temp.counter,
            "ids": temp.ids,
            duration
          }
        }
      }
    }
    return {
      slot: [temp],
      uuid: curBest.uuid
    };
  },
  listEvents: async (req, res) => {
    const { calendarId, date, time } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const queryTime = {};
    let queryDate = '';
    queryDate = (new Date(date)).toISOString().slice(0, 10);
    if (!time) {
      queryTime.timeMin = queryDate + 'T00:00:00.000Z';
      queryTime.timeMax = queryDate + 'T23:59:59.000Z';
    } else {
      queryTime.timeMin = queryDate + time.min;
      queryTime.timeMax = queryDate + time.max;
    }
    try {
      let gRes = await calendar.events.list({
        calendarId,
        timeMin: queryTime.timeMin,
        timeMax: queryTime.timeMax,
      });
      // save the last list's syncToken
      const calendarWatch = await CalendarWatch.findOne({ calendarId }).exec();
      if (!calendarWatch) {
        const newWatch = new CalendarWatch({
          calendarId,
          syncToken: gRes.data.nextSyncToken,
        });
        await newWatch.save();
      } else {
        await CalendarWatch.findOneAndUpdate({ calendarId },
          { $set: { syncToken: gRes.data.nextSyncToken } }).exec();
        console.log("syncToken updated!");
        console.log(gRes.data.nextSyncToken);
      }
      return gRes.data.items;
    } catch (e) {
      throw e;
    }
  },
  subscribeCalendar: async (req, res) => {
    const { calendarId } = req.body;
    log("subscribe calendar " + calendarId);
    const mmToken = await UserToken.findOne({ user_id: 'calendarmiddleman@gmail.com' }).exec();
    oAuth2Client.setCredentials(mmToken);
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const gRes = await calendar.calendarList.insert({
      requestBody: {
        id: calendarId
      }
    });
    return gRes.data;
  },
  getACL: async (req, res) => {
    const { calendarId } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const gRes = await calendar.acl.list({ calendarId });
    return gRes.data;
  },
  listACL: async (req, res) => {
    const { calendarId } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const gRes = await calendar.acl.list({ calendarId });
    return gRes;
  },
  removeACL: async (req, res) => {
    const { calendarId } = req.body;
    log("revoking mm access from " + calendarId);
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    let gRes = await calendar.acl.list({ calendarId });
    const listOfRules = gRes.data.items;
    const ruleId = listOfRules.find(el => el.scope.value === 'calendarmiddleman@gmail.com');
    if (ruleId) {
      gRes = await calendar.acl.delete({
        ruleId: ruleId.id,
        calendarId,
      });
    }
    return gRes;
  },
  shareCalendar: async (req, res) => {
    const { calendarId, userID } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    try {
      const userProfile = await UserProfile.findOne({ email: userID }).exec();
      const previousCalendarId = userProfile.calendarId;
      // remove MM from previously shared calendar *User*
      if (previousCalendarId) {
        await apis.removeACL({ ...req, body: { ...req.body, calendarId: previousCalendarId } }, res);
      }
      // add MM to new shared calendar *User*
      await calendar.acl.insert({
        calendarId,
        sendNotifications: true,
        requestBody: {
          role: "owner",
          scope: {
            type: "user",
            value: "calendarmiddleman@gmail.com"
          }
        }
      });
      const calendarProfile = await CalendarWatch.findOne({ calendarId: previousCalendarId }).exec();
      // stop watching on previous calendar *MM*
      if (previousCalendarId && calendarProfile && calendarProfile.channelInfo) {
        await apis.stopWatch({ ...req, body: { ...req.body, channelInfo: calendarProfile.channelInfo, calendarId } }, res);
      }
      UserProfile.findOneAndUpdate({ email: userID },
        { $set: { calendarId } },
        (err, result) => {
          if (err) throw err;
          if (!result) throw new Error('not found calendar');
          return 1;
        });

      await apis.subscribeCalendar(req, res);
      // start watching to new calendar *MM*
      await apis.watchEvents(req, res);

    } catch (err) {
      throw err;
    }
  }
};

const calendarAPIs = (app) => {
  app.use("/auth/", auth);
  app.use("/mmAuth/", mmAuth);

  app.post("/mmAuth/calendar/stopWatch", async (req, res) => {
    log("stop watching...");
    const gRes = await apis.stopWatch(req, res);
    res.status(200).send(gRes);
  });
  app.post("/auth/calendar/stopWatch", async (req, res) => {
    log("stop watching...");
    const gRes = await apis.stopWatch(req, res);
    res.status(200).send(gRes);
  });

  app.post("/auth/calendar/list", async (req, res) => {
    log("list all calendars");
    try {
      const parsed = await apis.listCalendars(req, res);
      res.status(200).send({ data: parsed });

    } catch (e) {
      res.status(500).send(e);
    }
  });

  // {
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
  app.post("/mmAuth/calendar/findSlot", async (req, res) => {
    log("find slots");

    // try {
    const slot = await apis.findSlot(req, res);
    res.status(200).send(slot)
    // } catch (e) {
    //   res.status(500).send(e);
    // }
  });
  app.post("/mmAuth/calendar/onChange", async (req, res) => {
    console.log("in on change");
    console.error(req.headers['x-goog-channel-id']);
    console.error(req.headers['x-goog-resource-id']);
    try {
      const gRes = await apis.onChange(req, res);
      res.status(200).send(gRes);
    } catch (e) {
      res.status(500).send(e);
    }

  });

  app.post("/mmAuth/calendar/watch", async (req, res) => {
    try {
      const gRes = await apis.watchEvents(req, res);
      res.status(200).send(gRes);
    } catch (e) {
      res.status(500).send(e);
    }
  });
  // {
  // 	"calendarId": "ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com",
  // 	"attendees": ["yiyang97728@gmail.com"],
  // 	"description":"I want to chat with yiyang",
  // 	"dateTime": {
  // 		"start": "2021-06-24T17:00:00.000Z",
  // 		"end": "2021-06-24T19:00:00.000Z"
  // 	},
  // 	"summary": "new meeting pushed by calendar"
  // }
  app.post("/mmAuth/calendar/pushCalendar", async (req, res) => {
    log("push to google calendar");
    // try {
    const gRes = await apis.pushCalendar(req, res);
    res.status(200).send(gRes);
    // } catch (e) {
    //   res.status(500).send(e);
    // }
  });

  app.post("/mmAuth/calendar/getUserEmail", async (req, res) => {
    log("get user email");

  })

  app.post("/mmAuth/calendar/subscribeCalendar", async (req, res) => {
    try {
      await apis.subscribeCalendar(req, res);
      res.status(200).send('successful');
    } catch (e) {
      res.status(500).send(e);
    }
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
  app.post("/mmAuth/calendar/findNorm", async (req, res) => {
    log("find norm");
    try {
      const gRes = await apis.findNorm(req, res);
      res.status(200).send(gRes);
    } catch (e) {
      res.status(500).send(e);
    }
  });
  // "date": "2021-06-23T13:00:00.00Z",
  // "calendarId": "ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com"
  app.post("/mmAuth/calendar/listEvents", async (req, res) => {
    log("list events");

    try {
      const gRes = await apis.listEvents(req, res);
      console.error("list response is: ");
      log(gRes);
      res.status(200).send(gRes);
    } catch (e) {
      res.status(500).send(e)
    }
  });
  app.post("/auth/calendar/getACL", async (req, res) => {
    log("get acl");
    const gRes = await apis.getACL(req, res);
    res.status(200).json(gRes);
  });
  app.post("/auth/calendar/listACL", async (req, res) => {
    log("list acl");
    const gRes = await apis.listACL(req, res);
    res.status(200).json(gRes);
  });
  // "userLoginToken": "",
  // "calendars": [{
  //       "id": "yiyang97728@gmail.com",
  //       "summary": "yiyang97728@gmail.com"
  //   }]
  app.post("/auth/calendar/shareCalendar", async (req, res) => {
    log("share calendar");
    // try {
    await apis.shareCalendar(req, res);
    res.status(200).send('successful');
    // } catch (e) { res.status(500).send(e) };
  });

  app.post("/auth/calendar/removeAccess", async (req, res) => {
    log("remove calendar access from middleman");
    try {
      await apis.removeACL(req, res);
      res.status(200).send('successful');
    } catch (e) { res.status(500).send(e) };
  });

};

module.exports = calendarAPIs;