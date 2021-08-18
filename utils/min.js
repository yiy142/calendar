
const util = require('util')
const _ = require('lodash');

function log(obj) {
  console.log((util.inspect(obj, false, null, true /* enable colors */)));
}
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

class ACR_Node {
  constructor(_left, _right, _counter, _payload) {
    this.left = _left;
    this.right = _right;
    this.counter = _counter;
    this.payload = _payload;
  }
}

class MinConflict {
  //helpers
  static calcDuration(slot) {
    return (slot.right - slot.left) / 60000;
  }
  static checkConflict(one, two) {
    if ((one.left >= two.left && one.left <= two.right)
      || (one.right <= two.right && one.right >= two.left)) {
      return true;
    }
    return false;
  }
  static backTrack(slotsWithCounter, duration) {
    const avaliableSlots = [];
    // console.log(slotsWithCounter);
    // do backtracking
    for (let i = 0; i < slotsWithCounter.length; i++) {
      let iDuration = this.calcDuration(slotsWithCounter[i]);
      let currentDuration = iDuration;
      let currentCounter;
      let currentIds = slotsWithCounter[i].id;
      if (currentDuration < duration) {
        currentCounter = slotsWithCounter[i].counter * iDuration;
        for (let j = i - 1; j >= 0; j--) {
          let jDuration = this.calcDuration(slotsWithCounter[j]);
          if (currentDuration + jDuration >= duration) {
            currentCounter += (duration - currentDuration) * slotsWithCounter[j].counter;
            const leftBound = new Date(slotsWithCounter[j].right - 60000 * (duration - currentDuration));
            currentIds = Array.from(new Set([...currentIds, ...slotsWithCounter[j].id]));
            avaliableSlots.push({ left: leftBound, right: slotsWithCounter[i].right, counter: currentCounter, tight: true, ids: currentIds });
            break;
          } else {
            currentDuration += jDuration;
            currentCounter += (slotsWithCounter[j].counter) * jDuration;
            currentIds = Array.from(new Set([...currentIds, ...slotsWithCounter[j].id]));
          }
        }
      } else {
        currentCounter = slotsWithCounter[i].counter * duration;
        avaliableSlots.push({ left: slotsWithCounter[i].left, right: slotsWithCounter[i].right, counter: currentCounter, tight: false, ids: slotsWithCounter[i].id })
      }
    }
    return avaliableSlots;
  }
  static flatEvents(id_events, id_preferences) {
    let events = [];
    Object.keys(id_events).forEach(key => {
      events = [...events, ...(id_events[key].map(event => ({
        ...event,
        type: 'event',
        calendarID: key,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
      })))];
    });

    Object.keys(id_preferences).forEach(key => {
      events = [...events, ...(id_preferences[key].preferences.map(preference => ({
        type: 'preference',
        calendarID: key,
        start: new Date(preference.start),
        end: new Date(preference.end),
        counter: preference.counter
      })))];
    });

    return events;
  }

  static getConflicts(events, { meeting_start_time, meeting_end_time }) {
    let conflicts = [];
    events.forEach(event => {
      // event that have intercect
      const intersect = (event.end >= meeting_start_time && event.end <= meeting_end_time) || (event.start >= meeting_start_time && event.start <= meeting_end_time);
      if (intersect) {
        const left = event.start < meeting_start_time ? meeting_start_time : event.start;
        const right = event.end > meeting_end_time ? meeting_end_time : event.end;
        conflicts.push({
          type: event.type,
          id: event.type === 'event' ? `event:${event.calendarID}:${event.id}` : `preference:${event.calendarID}:${event.counter}`,
          left,
          right,
          counter: event.counter || 1
        });
      }
    });
    return conflicts;
  }

  static ARC3(id_events, duration, time, id_preferences) {
    const { meeting_start_time, meeting_end_time } = time;
    const events = this.flatEvents(id_events, id_preferences);
    let conflicts = this.getConflicts(events, time).map(conflict => ({
      ...conflict,
      payload: [conflict.id]
    }));
    conflicts = (_.orderBy(conflicts, ['left', 'right'], ['asc', 'desc']));
    // console.log(conflicts);

    // initialize the arc queue
    let arc_queue = [new ACR_Node(meeting_start_time, meeting_end_time, 0, [])];
    for (let conflict of conflicts) {
      let moreFineGrained = [];
      for (let index in arc_queue) {
        const constraint = arc_queue[index];
        // if exact match
        if (conflict.right.getTime() == constraint.right.getTime() && conflict.left.getTime() == constraint.left.getTime()) {
          moreFineGrained = [...moreFineGrained, new ACR_Node(constraint.left, constraint.right, constraint.counter + conflict.counter, [...constraint.payload, ...conflict.payload])];
        }
        // if included
        else if ((conflict.right <= constraint.right && conflict.left >= constraint.left)
          || (constraint.right <= conflict.right && constraint.left >= conflict.left)) {
          let one, two;
          if (this.calcDuration(conflict) > this.calcDuration(constraint)) {
            one = conflict; two = constraint;
          } else { one = constraint; two = conflict; }
          if (one.left < two.left) moreFineGrained.push(new ACR_Node(one.left, two.left, one.counter, one.payload));
          moreFineGrained.push(new ACR_Node(two.left, two.right, one.counter + two.counter, [...one.payload, ...two.payload]));
          if (one.right > two.right) moreFineGrained.push(new ACR_Node(two.right, one.right, one.counter, one.payload));
        }
        // if no overlap
        else if ((conflict.right <= constraint.left) || conflict.left >= constraint.right) {
          moreFineGrained = [...moreFineGrained, constraint];
        }
        // if back intersect 
        else {
          if (conflict.left < constraint.left) {
            if (conflict.right.getTime() == constraint.right.getTime()) {
              moreFineGrained = [...moreFineGrained,
              new ACR_Node(conflict.left, constraint.left, conflict.counter, conflict.payload),
              new ACR_Node(constraint.left, conflict.right, conflict.counter + constraint.counter, [...conflict.payload, ...constraint.payload])];
            } else {
              moreFineGrained = [...moreFineGrained,
              new ACR_Node(conflict.left, constraint.left, conflict.counter, conflict.payload),
              new ACR_Node(constraint.left, conflict.right, conflict.counter + constraint.counter, [...conflict.payload, ...constraint.payload]),
              new ACR_Node(conflict.right, constraint.right, constraint.counter, constraint.payload)]
            }
          } else if (conflict.right > constraint.left) {
            if (conflict.left.getTime() == constraint.left.getTime()) {
              moreFineGrained = [...moreFineGrained,
              new ACR_Node(conflict.left, constraint.right, conflict.counter + constraint.counter, [...conflict.payload, ...constraint.payload]),
              new ACR_Node(constraint.right, conflict.right, conflict.counter, conflict.payload)]
            } else {
              moreFineGrained = [...moreFineGrained,
              new ACR_Node(constraint.left, conflict.left, constraint.counter, constraint.payload),
              new ACR_Node(conflict.left, constraint.right, constraint.counter + conflict.counter, [...constraint.payload, ...conflict.payload]),
              new ACR_Node(constraint.right, conflict.right, conflict.counter, conflict.payload)]
            }
          }
        }
      }
      // console.log("conflict");
      // console.log(conflict);
      // console.log("before");
      // console.log(moreFineGrained);
      if (!moreFineGrained.length) {
        moreFineGrained = [...arc_queue,
        new ACR_Node(conflict.left, conflict.right, conflict.counter, [conflict.id])
        ];
      }
      {
        moreFineGrained = _.orderBy(moreFineGrained, ['left', 'right', 'payload.length'], ['asc', 'asc', 'desc']);
        let filtered = [];
        let twoHead = 1;
        if (twoHead >= moreFineGrained.length) {
          arc_queue = [...moreFineGrained];
          continue;
        }

        for (let index = 0; index < moreFineGrained.length;) {
          const curr = moreFineGrained[index];
          const next = moreFineGrained[twoHead];
          if (!next) {
            filtered.push(curr);
            break;
          }
          if (curr.left.getTime() == next.left.getTime() && curr.right.getTime() == next.right.getTime()) {
            curr.payload = Array.from(new Set([...curr.payload, ...next.payload]));
            curr.counter = curr.payload.length;
            twoHead+=1;
          } else {
            filtered.push(curr);
            index = twoHead;
          }
        }
        
        arc_queue = [...filtered];
        // console.log("after");
        // console.log(arc_queue);
      }
    }
    arc_queue = arc_queue.map(el => ({
      ...el,
      id: el.payload
    }));
    const slotsWithCounter = _.orderBy(arc_queue, ['left'], ['asc']);
    const res = this.backTrack(slotsWithCounter, duration);
    const ans = (_.orderBy(res, ['counter', 'left'], ['asc', 'asc'])).map(el => ({ ...el, duration }));
    const formatted = ans.map(el => ({
      ...el,
      events: el.ids
    }));
    return formatted;
  }

  // put all constraints on a PQ, ordered by end time. 
  // dequeue every constraint and shrink the domain.
  // every step upon shrinking a domain got a count number.
  // return the feasible slot with the lowest count number or combined count number
  static Tree_ARC3(id_events, duration, time, id_preferences) {
    let { meeting_start_time, meeting_end_time } = time;
    meeting_start_time = new Date(meeting_start_time);
    meeting_end_time = new Date(meeting_end_time);
    // get all events from both calendar and the user_preference DB
    const events = this.flatEvents(id_events, id_preferences);
    if (!events.length) {
      return {
        slot: [{
          left: meeting_start_time,
          right: meeting_end_time,
          tight: false,
          counter: 0,
          ids: [],
          duration
        }],
        root: null,
        conflicts: []
      };
    }
    // get the conflict
    let conflicts = this.getConflicts(events, {
      meeting_start_time,
      meeting_end_time
    });
    if (!conflicts.length) {
      return {
        slot: [{
          left: meeting_start_time,
          right: meeting_end_time,
          tight: false,
          counter: 0,
          ids: [],
          duration
        }],
        root: null,
        conflicts: []
      };
    }
    // sort by start time and get counter for each interval
    conflicts = _.orderBy(conflicts, ['left', 'right'], ['asc', 'desc']);
    // conflicts are sorted, so the root must be the one starts earliest and also the longest duration
    const root = new Node(conflicts[0].left, conflicts[0].right, conflicts[0].counter, [conflicts[0].id]);
    // build the conflict tree
    conflicts.slice(1).forEach(conflict => {
      this.recursiveBuildTree(root, conflict);
    });
    const ans = this.bestSlot(root, { time, duration });
    return { slot: ans, root, conflicts };
  }

  static bestSlot(root, { time, duration }) {
    // prob the conflict tree and find the best slot and sort
    let conflictsWithCounter = _.orderBy(this.probeTree(root), 'left', ['asc']);
    let meeting_start_time = new Date(time.meeting_start_time);
    let meeting_end_time = new Date(time.meeting_end_time);

    // console.error(conflictsWithCounter);
    let leftIndex = new Date(meeting_start_time);
    // console.log(leftIndex);
    conflictsWithCounter = conflictsWithCounter.map(el =>
      ({ ...el, left: new Date(el.left), right: new Date(el.right) })
    );
    const allSlotsWithCounter = [];
    // find all candidate slots
    conflictsWithCounter.forEach(conflict => {
      // console.log(conflict.left);
      const diff = leftIndex - conflict.left;
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
      })
    }
    const slotsWithCounter = _.orderBy(allSlotsWithCounter, ['left'], ['asc']);
    console.log(slotsWithCounter);
    const res = this.backTrack(slotsWithCounter, duration);
    const ans = (_.orderBy(res, ['counter', 'left'], ['asc', 'asc'])).map(el => ({ ...el, duration }));
    // console.log("in best slot");
    return ans;
  }

  static releasingConstraint(constraintID, { conflicts, root }) {
    const existingIDs = conflicts.map(el => el.id);
    const constraintIndex = existingIDs.indexOf(constraintID);
    const constraint = conflicts[constraintIndex];
    const remainingConflicts = conflicts.slice(constraintIndex + 1);
    if (constraintIndex === -1) {
      log('invalid constraint ID, please double check');
      log(existingIDs);
      return { root, conflicts, notModified: true };
    }
    if (remainingConflicts.length === 0) {
      log('removing the last constraint');
    }

    let newRoot = Object.assign({}, root);
    let curNode = newRoot;
    let preNode = null;
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
    }
    // log(remainingConflicts);
    if (!!preNode) {
      // preNode.events.splice(preNode.events.indexOf(constraintID), 1);
      preNode.next = null;
      preNode.child = null;
      remainingConflicts.forEach(conflict => {
        this.recursiveBuildTree(preNode, conflict);
      });
    } else {
      log('removing root!');
      if (remainingConflicts.length === 0) {
        return {
          clean: true,
          root: null,
          conflicts: [],
          notModified: false,
        }
      }
      newRoot = new Node(remainingConflicts[0].left, remainingConflicts[0].right, remainingConflicts[0].counter, [remainingConflicts[0].id]);
      remainingConflicts.slice(1).forEach(conflict => {
        this.recursiveBuildTree(newRoot, conflict);
      });
    }
    return { root: newRoot, conflicts: conflicts.filter(el => el.id !== constraintID), notModified: false };
  }

  static probeTree(root) {
    const cleaned = {
      left: root.left,
      right: root.right,
      id: root.events,
      counter: root.counter,
    }
    if (!!root.child) {
      if (!!root.next) return [...this.probeTree(root.next), ...this.probeTree(root.child)];
      return [...this.probeTree(root.child)];
    }
    if (!!root.next) return [cleaned, ...this.probeTree(root.next)];
    return [cleaned];
  }
  /**
   * 
   * @param {object} currentRoot 
   * @param {left: String, right: String, id: String} conflict 
   */
  static recursiveBuildTree(currentRoot, conflict) {
    // case of exact match, increase the current counter
    if (currentRoot.left.toString() === conflict.left.toString() && currentRoot.right.toString() === conflict.right.toString()) {
      currentRoot.counter += conflict.counter;
      currentRoot.events = [conflict.id, ...currentRoot.events];
    }
    // case of back intersect
    else if (conflict.left >= currentRoot.left && conflict.left < currentRoot.right && conflict.right > currentRoot.right) {
      //update the next
      this.recursiveBuildTree(currentRoot, {
        id: conflict.id,
        left: currentRoot.right,
        right: conflict.right,
        counter: conflict.counter,
      });
      //update the child
      this.recursiveBuildTree(currentRoot, {
        id: conflict.id,
        left: conflict.left,
        right: currentRoot.right,
        counter: conflict.counter
      });
    }
    // case of including, do not consider the case of exact match 
    else if (currentRoot.left <= conflict.left && currentRoot.right >= conflict.right) {
      if (!currentRoot.child) {
        // conflict's left is bigger
        if (currentRoot.left < conflict.left) {
          currentRoot.child = new Node(currentRoot.left, conflict.left, currentRoot.counter, [...currentRoot.events]);
          currentRoot.child.next = new Node(conflict.left, conflict.right, currentRoot.counter + conflict.counter, [...currentRoot.events, conflict.id]);
          if (conflict.right < currentRoot.right)
            currentRoot.child.next.next = new Node(conflict.right, currentRoot.right, currentRoot.counter, [...currentRoot.events]);
        }
        // lefts are same
        else {
          currentRoot.child = new Node(currentRoot.left, conflict.right, currentRoot.counter + conflict.counter, [...currentRoot.events, conflict.id]);
          currentRoot.child.next = new Node(conflict.right, currentRoot.right, currentRoot.counter, [...currentRoot.events]);
        }
      }
      // if existing child 
      else {
        this.recursiveBuildTree(currentRoot.child, conflict);
      }
    }
    // no overlap
    else {
      if (!currentRoot.next) currentRoot.next = new Node(conflict.left, conflict.right, conflict.counter, [conflict.id]);
      else {
        this.recursiveBuildTree(currentRoot.next, conflict);
      }
    }
  }
}

module.exports = MinConflict;

const user_preferences = {
  'ID_1': {
    'break_time': 10, // 10 minutes break time
    'day_off': [1, 5], // days when meetings cannot be scheduled
    'max_meeting': 3, // max meeting number per day
    'preferences': [
      {
        'start': new Date('2021-05-10T17:00:00.00-07:00'), //00:00
        'end': new Date('2021-05-11T00:00:00.00-08:00'), //8:00
        'counter': 5
      }
    ]
  },
  'ID_2': {
    'break_time': 30,
    'day_off': [],
    'max_meeting': 0, // 0 means he does not care
    'preferences': []
  }
};

const time = {
  meeting_start_time: new Date('2021-05-11T00:00:00.00-07:00'), //7:00
  meeting_end_time: new Date('2021-05-11T09:00:00.00-07:00') //16:00
};
const id_events = {
  'ID_1': [
    {
      kind: 'calendar#event',
      etag: '"3241427021646000"',
      id: '10po6thb1130bvdkurrmfb8ifa',
      status: 'confirmed',
      htmlLink:
        'https://www.google.com/calendar/event?eid=MTBwbzZ0aGIxMTMwYnZka3Vycm1mYjhpZmEgZ2ExczE5b292czR0OWxzbzBwaWxiMmc4ODRAZw',
      created: '2021-05-11T06:11:50.000Z',
      updated: '2021-05-11T06:11:50.823Z',
      summary: 'testEvent1',
      creator: { email: 'calendarmiddleman@gmail.com' },
      organizer:
      {
        email: 'ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com',
        displayName: 'testtest',
        self: true
      },
      start: { dateTime: '2021-05-11T00:00:00-07:00' }, //7:00
      end: { dateTime: '2021-05-11T02:00:00-07:00' }, //9:00
      iCalUID: '10po6thb1130bvdkurrmfb8ifa@google.com',
      sequence: 0,
      reminders: { useDefault: true },
      eventType: 'default'
    },
    {
      kind: 'calendar#event',
      etag: '"3241427045030000"',
      id: '3tsjh94q33ncdgn2cqjn5f0hd5',
      status: 'confirmed',
      htmlLink:
        'https://www.google.com/calendar/event?eid=M3Rzamg5NHEzM25jZGduMmNxam41ZjBoZDUgZ2ExczE5b292czR0OWxzbzBwaWxiMmc4ODRAZw',
      created: '2021-05-11T05:45:50.000Z',
      updated: '2021-05-11T06:12:02.515Z',
      summary: 'testEvent2',
      creator: { email: 'calendarmiddleman@gmail.com' },
      organizer:
      {
        email: 'ga1s19oovs4t9lso0pilb2g884@group.calendar.google.com',
        displayName: 'testtest',
        self: true
      },
      // start: { dateTime: '2021-05-11T00:00:00-07:00' }, //7:00
      // end: { dateTime: '2021-05-11T02:00:00-07:00' }, //9:00
      start: { dateTime: '2021-05-11T06:00:00-07:00' }, //13:00
      end: { dateTime: '2021-05-11T08:00:00-07:00' }, //15:00
      iCalUID: '3tsjh94q33ncdgn2cqjn5f0hd5@google.com',
      sequence: 0,
      reminders: { useDefault: true },
      eventType: 'default'
    }]
};

// const res = MinConflict.Tree_ARC3(id_events, 120, time, user_preferences);
// const res = MinConflict.ARC3(id_events, 120, time, user_preferences);
// const newRoot = MinConflict.releasingConstraint('event:ID_1:10po6thb1130bvdkurrmfb8ifa','1')
