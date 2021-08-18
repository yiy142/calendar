"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var util = require('util');

var _ = require('lodash');

function log(obj) {
  console.log(util.inspect(obj, false, null, true
  /* enable colors */
  ));
}

var Node = function Node(_left, _right, _counter, _payload) {
  _classCallCheck(this, Node);

  this.left = _left;
  this.right = _right;
  this.counter = _counter;
  this.child = null;
  this.next = null;
  this.events = _payload;
};

var ACR_Node = function ACR_Node(_left, _right, _counter, _payload) {
  _classCallCheck(this, ACR_Node);

  this.left = _left;
  this.right = _right;
  this.counter = _counter;
  this.payload = _payload;
};

var MinConflict =
/*#__PURE__*/
function () {
  function MinConflict() {
    _classCallCheck(this, MinConflict);
  }

  _createClass(MinConflict, null, [{
    key: "calcDuration",
    //helpers
    value: function calcDuration(slot) {
      return (slot.right - slot.left) / 60000;
    }
  }, {
    key: "checkConflict",
    value: function checkConflict(one, two) {
      if (one.left >= two.left && one.left <= two.right || one.right <= two.right && one.right >= two.left) {
        return true;
      }

      return false;
    }
  }, {
    key: "backTrack",
    value: function backTrack(slotsWithCounter, duration) {
      var avaliableSlots = []; // console.log(slotsWithCounter);
      // do backtracking

      for (var i = 0; i < slotsWithCounter.length; i++) {
        var iDuration = this.calcDuration(slotsWithCounter[i]);
        var currentDuration = iDuration;
        var currentCounter = void 0;
        var currentIds = slotsWithCounter[i].id;

        if (currentDuration < duration) {
          currentCounter = slotsWithCounter[i].counter * iDuration;

          for (var j = i - 1; j >= 0; j--) {
            var jDuration = this.calcDuration(slotsWithCounter[j]);

            if (currentDuration + jDuration >= duration) {
              currentCounter += (duration - currentDuration) * slotsWithCounter[j].counter;
              var leftBound = new Date(slotsWithCounter[j].right - 60000 * (duration - currentDuration));
              currentIds = Array.from(new Set([].concat(_toConsumableArray(currentIds), _toConsumableArray(slotsWithCounter[j].id))));
              avaliableSlots.push({
                left: leftBound,
                right: slotsWithCounter[i].right,
                counter: currentCounter,
                tight: true,
                ids: currentIds
              });
              break;
            } else {
              currentDuration += jDuration;
              currentCounter += slotsWithCounter[j].counter * jDuration;
              currentIds = Array.from(new Set([].concat(_toConsumableArray(currentIds), _toConsumableArray(slotsWithCounter[j].id))));
            }
          }
        } else {
          currentCounter = slotsWithCounter[i].counter * duration;
          avaliableSlots.push({
            left: slotsWithCounter[i].left,
            right: slotsWithCounter[i].right,
            counter: currentCounter,
            tight: false,
            ids: slotsWithCounter[i].id
          });
        }
      }

      return avaliableSlots;
    }
  }, {
    key: "flatEvents",
    value: function flatEvents(id_events, id_preferences) {
      var events = [];
      Object.keys(id_events).forEach(function (key) {
        events = [].concat(_toConsumableArray(events), _toConsumableArray(id_events[key].map(function (event) {
          return _objectSpread({}, event, {
            type: 'event',
            calendarID: key,
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime)
          });
        })));
      });
      Object.keys(id_preferences).forEach(function (key) {
        events = [].concat(_toConsumableArray(events), _toConsumableArray(id_preferences[key].preferences.map(function (preference) {
          return {
            type: 'preference',
            calendarID: key,
            start: new Date(preference.start),
            end: new Date(preference.end),
            counter: preference.counter
          };
        })));
      });
      return events;
    }
  }, {
    key: "getConflicts",
    value: function getConflicts(events, _ref) {
      var meeting_start_time = _ref.meeting_start_time,
          meeting_end_time = _ref.meeting_end_time;
      var conflicts = [];
      events.forEach(function (event) {
        // event that have intercect
        var intersect = event.end >= meeting_start_time && event.end <= meeting_end_time || event.start >= meeting_start_time && event.start <= meeting_end_time;

        if (intersect) {
          var left = event.start < meeting_start_time ? meeting_start_time : event.start;
          var right = event.end > meeting_end_time ? meeting_end_time : event.end;
          conflicts.push({
            type: event.type,
            id: event.type === 'event' ? "event:".concat(event.calendarID, ":").concat(event.id) : "preference:".concat(event.calendarID, ":").concat(event.counter),
            left: left,
            right: right,
            counter: event.counter || 1
          });
        }
      });
      return conflicts;
    }
  }, {
    key: "ARC3",
    value: function ARC3(id_events, duration, time, id_preferences) {
      var meeting_start_time = time.meeting_start_time,
          meeting_end_time = time.meeting_end_time;
      var events = this.flatEvents(id_events, id_preferences);
      var conflicts = this.getConflicts(events, time).map(function (conflict) {
        return _objectSpread({}, conflict, {
          payload: [conflict.id]
        });
      });
      conflicts = _.orderBy(conflicts, ['left', 'right'], ['asc', 'desc']); // console.log(conflicts);
      // initialize the arc queue

      var arc_queue = [new ACR_Node(meeting_start_time, meeting_end_time, 0, [])];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = conflicts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var conflict = _step.value;
          var moreFineGrained = [];

          for (var index in arc_queue) {
            var constraint = arc_queue[index]; // if exact match

            if (conflict.right.getTime() == constraint.right.getTime() && conflict.left.getTime() == constraint.left.getTime()) {
              moreFineGrained = [].concat(_toConsumableArray(moreFineGrained), [new ACR_Node(constraint.left, constraint.right, constraint.counter + conflict.counter, [].concat(_toConsumableArray(constraint.payload), _toConsumableArray(conflict.payload)))]);
            } // if included
            else if (conflict.right <= constraint.right && conflict.left >= constraint.left || constraint.right <= conflict.right && constraint.left >= conflict.left) {
                var one = void 0,
                    two = void 0;

                if (this.calcDuration(conflict) > this.calcDuration(constraint)) {
                  one = conflict;
                  two = constraint;
                } else {
                  one = constraint;
                  two = conflict;
                }

                if (one.left < two.left) moreFineGrained.push(new ACR_Node(one.left, two.left, one.counter, one.payload));
                moreFineGrained.push(new ACR_Node(two.left, two.right, one.counter + two.counter, [].concat(_toConsumableArray(one.payload), _toConsumableArray(two.payload))));
                if (one.right > two.right) moreFineGrained.push(new ACR_Node(two.right, one.right, one.counter, one.payload));
              } // if no overlap
              else if (conflict.right <= constraint.left || conflict.left >= constraint.right) {
                  moreFineGrained = [].concat(_toConsumableArray(moreFineGrained), [constraint]);
                } // if back intersect 
                else {
                    if (conflict.left < constraint.left) {
                      if (conflict.right.getTime() == constraint.right.getTime()) {
                        moreFineGrained = [].concat(_toConsumableArray(moreFineGrained), [new ACR_Node(conflict.left, constraint.left, conflict.counter, conflict.payload), new ACR_Node(constraint.left, conflict.right, conflict.counter + constraint.counter, [].concat(_toConsumableArray(conflict.payload), _toConsumableArray(constraint.payload)))]);
                      } else {
                        moreFineGrained = [].concat(_toConsumableArray(moreFineGrained), [new ACR_Node(conflict.left, constraint.left, conflict.counter, conflict.payload), new ACR_Node(constraint.left, conflict.right, conflict.counter + constraint.counter, [].concat(_toConsumableArray(conflict.payload), _toConsumableArray(constraint.payload))), new ACR_Node(conflict.right, constraint.right, constraint.counter, constraint.payload)]);
                      }
                    } else if (conflict.right > constraint.left) {
                      if (conflict.left.getTime() == constraint.left.getTime()) {
                        moreFineGrained = [].concat(_toConsumableArray(moreFineGrained), [new ACR_Node(conflict.left, constraint.right, conflict.counter + constraint.counter, [].concat(_toConsumableArray(conflict.payload), _toConsumableArray(constraint.payload))), new ACR_Node(constraint.right, conflict.right, conflict.counter, conflict.payload)]);
                      } else {
                        moreFineGrained = [].concat(_toConsumableArray(moreFineGrained), [new ACR_Node(constraint.left, conflict.left, constraint.counter, constraint.payload), new ACR_Node(conflict.left, constraint.right, constraint.counter + conflict.counter, [].concat(_toConsumableArray(constraint.payload), _toConsumableArray(conflict.payload))), new ACR_Node(constraint.right, conflict.right, conflict.counter, conflict.payload)]);
                      }
                    }
                  }
          } // console.log("conflict");
          // console.log(conflict);
          // console.log("before");
          // console.log(moreFineGrained);


          if (!moreFineGrained.length) {
            moreFineGrained = [].concat(_toConsumableArray(arc_queue), [new ACR_Node(conflict.left, conflict.right, conflict.counter, [conflict.id])]);
          }

          {
            moreFineGrained = _.orderBy(moreFineGrained, ['left', 'right', 'payload.length'], ['asc', 'asc', 'desc']);
            var filtered = [];
            var twoHead = 1;

            if (twoHead >= moreFineGrained.length) {
              arc_queue = _toConsumableArray(moreFineGrained);
              continue;
            }

            for (var _index = 0; _index < moreFineGrained.length;) {
              var curr = moreFineGrained[_index];
              var next = moreFineGrained[twoHead];

              if (!next) {
                filtered.push(curr);
                break;
              }

              if (curr.left.getTime() == next.left.getTime() && curr.right.getTime() == next.right.getTime()) {
                curr.payload = Array.from(new Set([].concat(_toConsumableArray(curr.payload), _toConsumableArray(next.payload))));
                curr.counter = curr.payload.length;
                twoHead += 1;
              } else {
                filtered.push(curr);
                _index = twoHead;
              }
            }

            arc_queue = [].concat(filtered); // console.log("after");
            // console.log(arc_queue);
          }
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

      arc_queue = arc_queue.map(function (el) {
        return _objectSpread({}, el, {
          id: el.payload
        });
      });

      var slotsWithCounter = _.orderBy(arc_queue, ['left'], ['asc']);

      var res = this.backTrack(slotsWithCounter, duration);

      var ans = _.orderBy(res, ['counter', 'left'], ['asc', 'asc']).map(function (el) {
        return _objectSpread({}, el, {
          duration: duration
        });
      });

      var formatted = ans.map(function (el) {
        return _objectSpread({}, el, {
          events: el.ids
        });
      });
      return formatted;
    } // put all constraints on a PQ, ordered by end time. 
    // dequeue every constraint and shrink the domain.
    // every step upon shrinking a domain got a count number.
    // return the feasible slot with the lowest count number or combined count number

  }, {
    key: "Tree_ARC3",
    value: function Tree_ARC3(id_events, duration, time, id_preferences) {
      var _this = this;

      var meeting_start_time = time.meeting_start_time,
          meeting_end_time = time.meeting_end_time;
      meeting_start_time = new Date(meeting_start_time);
      meeting_end_time = new Date(meeting_end_time); // get all events from both calendar and the user_preference DB

      var events = this.flatEvents(id_events, id_preferences);

      if (!events.length) {
        return {
          slot: [{
            left: meeting_start_time,
            right: meeting_end_time,
            tight: false,
            counter: 0,
            ids: [],
            duration: duration
          }],
          root: null,
          conflicts: []
        };
      } // get the conflict


      var conflicts = this.getConflicts(events, {
        meeting_start_time: meeting_start_time,
        meeting_end_time: meeting_end_time
      });

      if (!conflicts.length) {
        return {
          slot: [{
            left: meeting_start_time,
            right: meeting_end_time,
            tight: false,
            counter: 0,
            ids: [],
            duration: duration
          }],
          root: null,
          conflicts: []
        };
      } // sort by start time and get counter for each interval


      conflicts = _.orderBy(conflicts, ['left', 'right'], ['asc', 'desc']); // conflicts are sorted, so the root must be the one starts earliest and also the longest duration

      var root = new Node(conflicts[0].left, conflicts[0].right, conflicts[0].counter, [conflicts[0].id]); // build the conflict tree

      conflicts.slice(1).forEach(function (conflict) {
        _this.recursiveBuildTree(root, conflict);
      });
      var ans = this.bestSlot(root, {
        time: time,
        duration: duration
      });
      return {
        slot: ans,
        root: root,
        conflicts: conflicts
      };
    }
  }, {
    key: "bestSlot",
    value: function bestSlot(root, _ref2) {
      var time = _ref2.time,
          duration = _ref2.duration;

      // prob the conflict tree and find the best slot and sort
      var conflictsWithCounter = _.orderBy(this.probeTree(root), 'left', ['asc']);

      var meeting_start_time = new Date(time.meeting_start_time);
      var meeting_end_time = new Date(time.meeting_end_time); // console.error(conflictsWithCounter);

      var leftIndex = new Date(meeting_start_time); // console.log(leftIndex);

      conflictsWithCounter = conflictsWithCounter.map(function (el) {
        return _objectSpread({}, el, {
          left: new Date(el.left),
          right: new Date(el.right)
        });
      });
      var allSlotsWithCounter = []; // find all candidate slots

      conflictsWithCounter.forEach(function (conflict) {
        // console.log(conflict.left);
        var diff = leftIndex - conflict.left;

        if (diff < 0) {
          allSlotsWithCounter.push({
            left: leftIndex,
            right: conflict.left,
            counter: 0,
            id: []
          });
          allSlotsWithCounter.push(conflict);
          leftIndex = conflict.right;
        } else {
          allSlotsWithCounter.push(conflict);
          leftIndex = conflict.right;
        }
      });

      if (leftIndex - meeting_end_time < 0) {
        allSlotsWithCounter.push({
          left: leftIndex,
          right: meeting_end_time,
          counter: 0,
          id: []
        });
      }

      var slotsWithCounter = _.orderBy(allSlotsWithCounter, ['left'], ['asc']);

      console.log(slotsWithCounter);
      var res = this.backTrack(slotsWithCounter, duration);

      var ans = _.orderBy(res, ['counter', 'left'], ['asc', 'asc']).map(function (el) {
        return _objectSpread({}, el, {
          duration: duration
        });
      }); // console.log("in best slot");


      return ans;
    }
  }, {
    key: "releasingConstraint",
    value: function releasingConstraint(constraintID, _ref3) {
      var _this2 = this;

      var conflicts = _ref3.conflicts,
          root = _ref3.root;
      var existingIDs = conflicts.map(function (el) {
        return el.id;
      });
      var constraintIndex = existingIDs.indexOf(constraintID);
      var constraint = conflicts[constraintIndex];
      var remainingConflicts = conflicts.slice(constraintIndex + 1);

      if (constraintIndex === -1) {
        log('invalid constraint ID, please double check');
        log(existingIDs);
        return {
          root: root,
          conflicts: conflicts,
          notModified: true
        };
      }

      if (remainingConflicts.length === 0) {
        log('removing the last constraint');
      }

      var newRoot = Object.assign({}, root);
      var curNode = newRoot;
      var preNode = null;

      while (curNode) {
        if (curNode.events.includes(constraintID)) {
          break;
        } else {
          preNode = curNode;

          if (constraint.left >= curNode.right) {
            curNode = curNode.next;
          } else {
            if (constraint.left >= curNode.left && constraint.right <= curNode.right) {
              break;
            }

            curNode = curNode.child;
          }
        }
      } // log(remainingConflicts);


      if (!!preNode) {
        // preNode.events.splice(preNode.events.indexOf(constraintID), 1);
        preNode.next = null;
        preNode.child = null;
        remainingConflicts.forEach(function (conflict) {
          _this2.recursiveBuildTree(preNode, conflict);
        });
      } else {
        log('removing root!');

        if (remainingConflicts.length === 0) {
          return {
            clean: true,
            root: null,
            conflicts: [],
            notModified: false
          };
        }

        newRoot = new Node(remainingConflicts[0].left, remainingConflicts[0].right, remainingConflicts[0].counter, [remainingConflicts[0].id]);
        remainingConflicts.slice(1).forEach(function (conflict) {
          _this2.recursiveBuildTree(newRoot, conflict);
        });
      }

      return {
        root: newRoot,
        conflicts: conflicts.filter(function (el) {
          return el.id !== constraintID;
        }),
        notModified: false
      };
    }
  }, {
    key: "probeTree",
    value: function probeTree(root) {
      var cleaned = {
        left: root.left,
        right: root.right,
        id: root.events,
        counter: root.counter
      };

      if (!!root.child) {
        if (!!root.next) return [].concat(_toConsumableArray(this.probeTree(root.next)), _toConsumableArray(this.probeTree(root.child)));
        return _toConsumableArray(this.probeTree(root.child));
      }

      if (!!root.next) return [cleaned].concat(_toConsumableArray(this.probeTree(root.next)));
      return [cleaned];
    }
    /**
     * 
     * @param {object} currentRoot 
     * @param {left: String, right: String, id: String} conflict 
     */

  }, {
    key: "recursiveBuildTree",
    value: function recursiveBuildTree(currentRoot, conflict) {
      // case of exact match, increase the current counter
      if (currentRoot.left.toString() === conflict.left.toString() && currentRoot.right.toString() === conflict.right.toString()) {
        currentRoot.counter += conflict.counter;
        currentRoot.events = [conflict.id].concat(_toConsumableArray(currentRoot.events));
      } // case of back intersect
      else if (conflict.left >= currentRoot.left && conflict.left < currentRoot.right && conflict.right > currentRoot.right) {
          //update the next
          this.recursiveBuildTree(currentRoot, {
            id: conflict.id,
            left: currentRoot.right,
            right: conflict.right,
            counter: conflict.counter
          }); //update the child

          this.recursiveBuildTree(currentRoot, {
            id: conflict.id,
            left: conflict.left,
            right: currentRoot.right,
            counter: conflict.counter
          });
        } // case of including, do not consider the case of exact match 
        else if (currentRoot.left <= conflict.left && currentRoot.right >= conflict.right) {
            if (!currentRoot.child) {
              // conflict's left is bigger
              if (currentRoot.left < conflict.left) {
                currentRoot.child = new Node(currentRoot.left, conflict.left, currentRoot.counter, _toConsumableArray(currentRoot.events));
                currentRoot.child.next = new Node(conflict.left, conflict.right, currentRoot.counter + conflict.counter, [].concat(_toConsumableArray(currentRoot.events), [conflict.id]));
                if (conflict.right < currentRoot.right) currentRoot.child.next.next = new Node(conflict.right, currentRoot.right, currentRoot.counter, _toConsumableArray(currentRoot.events));
              } // lefts are same
              else {
                  currentRoot.child = new Node(currentRoot.left, conflict.right, currentRoot.counter + conflict.counter, [].concat(_toConsumableArray(currentRoot.events), [conflict.id]));
                  currentRoot.child.next = new Node(conflict.right, currentRoot.right, currentRoot.counter, _toConsumableArray(currentRoot.events));
                }
            } // if existing child 
            else {
                this.recursiveBuildTree(currentRoot.child, conflict);
              }
          } // no overlap
          else {
              if (!currentRoot.next) currentRoot.next = new Node(conflict.left, conflict.right, conflict.counter, [conflict.id]);else {
                this.recursiveBuildTree(currentRoot.next, conflict);
              }
            }
    }
  }]);

  return MinConflict;
}();

module.exports = MinConflict;
var user_preferences = {
  'ID_1': {
    'break_time': 10,
    // 10 minutes break time
    'day_off': [1, 5],
    // days when meetings cannot be scheduled
    'max_meeting': 3,
    // max meeting number per day
    'preferences': [{
      'start': new Date('2021-05-10T17:00:00.00-07:00'),
      //00:00
      'end': new Date('2021-05-11T00:00:00.00-08:00'),
      //8:00
      'counter': 5
    }]
  },
  'ID_2': {
    'break_time': 30,
    'day_off': [],
    'max_meeting': 0,
    // 0 means he does not care
    'preferences': []
  }
};
var time = {
  meeting_start_time: new Date('2021-05-11T00:00:00.00-07:00'),
  //7:00
  meeting_end_time: new Date('2021-05-11T09:00:00.00-07:00') //16:00

};
var id_events = {
  'ID_1': [{
    kind: 'calendar#event',
    etag: '"3241427021646000"',
    id: '10po6thb1130bvdkurrmfb8ifa',
    status: 'confirmed',
    htmlLink: 'https://www.google.com/calendar/event?eid=MTBwbzZ0aGIxMTMwYnZka3Vycm1mYjhpZmEgZ2ExczE5b292czR0OWxzbzBwaWxiMmc4ODRAZw',
    created: '2021-05-11T06:11:50.000Z',
    updated: '2021-05-11T06:11:50.823Z',
    summary: 'testEvent1',
    creator: {
      email: 'calendarmiddleman@gmail.com'
    },
    organizer: {
      email: 'ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com',
      displayName: 'testtest',
      self: true
    },
    start: {
      dateTime: '2021-05-11T00:00:00-07:00'
    },
    //7:00
    end: {
      dateTime: '2021-05-11T02:00:00-07:00'
    },
    //9:00
    iCalUID: '10po6thb1130bvdkurrmfb8ifa@google.com',
    sequence: 0,
    reminders: {
      useDefault: true
    },
    eventType: 'default'
  }, {
    kind: 'calendar#event',
    etag: '"3241427045030000"',
    id: '3tsjh94q33ncdgn2cqjn5f0hd5',
    status: 'confirmed',
    htmlLink: 'https://www.google.com/calendar/event?eid=M3Rzamg5NHEzM25jZGduMmNxam41ZjBoZDUgZ2ExczE5b292czR0OWxzbzBwaWxiMmc4ODRAZw',
    created: '2021-05-11T05:45:50.000Z',
    updated: '2021-05-11T06:12:02.515Z',
    summary: 'testEvent2',
    creator: {
      email: 'calendarmiddleman@gmail.com'
    },
    organizer: {
      email: 'ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com',
      displayName: 'testtest',
      self: true
    },
    // start: { dateTime: '2021-05-11T00:00:00-07:00' }, //7:00
    // end: { dateTime: '2021-05-11T02:00:00-07:00' }, //9:00
    start: {
      dateTime: '2021-05-11T06:00:00-07:00'
    },
    //13:00
    end: {
      dateTime: '2021-05-11T08:00:00-07:00'
    },
    //15:00
    iCalUID: '3tsjh94q33ncdgn2cqjn5f0hd5@google.com',
    sequence: 0,
    reminders: {
      useDefault: true
    },
    eventType: 'default'
  }]
}; // const res = MinConflict.Tree_ARC3(id_events, 120, time, user_preferences);
// const res = MinConflict.ARC3(id_events, 120, time, user_preferences);
// const newRoot = MinConflict.releasingConstraint('event:ID_1:10po6thb1130bvdkurrmfb8ifa','1')