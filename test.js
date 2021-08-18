const _ = require('lodash');
const deep = [{
  a: '1',
  b: {
    left: 0
  }
},
{
  a: '2',
  b: {
    left: -1
  }
}
]
console.log((_.orderBy(deep, ['b.left'], ['asc'])))

// function deploy(failed, total, dependencies) {
//   // write code here

//   const resultArr = [];
//   for (let i in dependencies) {
//     const successRate = failed.map((el, index) => ((total[index] - el) / total[index]));
//     successRate[i] = 1;
//     for (let inner in dependencies) {
//       let eachProb = successRate[inner];
//       dependencies[inner].forEach(dep => {
//         if (dep === i) {
//         } else {
//           eachProb = eachProb * successRate[dep];
//         }
//       });
//       successRate[inner] = eachProb;
//     }
//     resultArr.push(Math.min(...successRate));
//   }
//   return makeRes(Math.max(...resultArr));
// }

// function makeRes(num) {
//   return (Math.round((num * 100000000)) / 1000000).toFixed(6) + '%';
// }

// let [a, b, c] = [[1, 1, 1, 1, 1], [10, 10, 10, 10, 10], [[], [0], [1], [2], [3]]];

// class MyPromise {
//   static pending = 'pending';
//   static fulfilled = 'fulfilled';
//   static rejected = 'rejected';

//   constructor(executor) {
//     this.state = MyPromise.pending;
//     this.value = undefined;
//     this.reason = undefined;
//     this.callbacks = [];

//     try {
//       executor(this.resolve.bind(this), this.reject.bind(this));
//     } catch (e) { throw e };
//   }

//   resolve(value) {
//     this.value = value;
//     this.state = MyPromise.fulfilled;
//     this.callbacks.forEach(fn => handler(fn));
//   }

//   reject(reason) {
//     this.reason = reason;
//     this.state = MyPromise.rejected;
//     this.callbacks.forEach(fn => handler(fn));
//   }

//   handler(callback) {
//     const { onFulfilled, onRejected, nextResolve, nextReject } = callback;
//     switch (this.state) {
//       case MyPromise.pending:
//         this.callbacks.push(callback);
//         break;
//       case MyPromise.fulfilled:
//         const nextValue = onFulfilled ? onFulfilled(this.value) : this.value;
//         nextResolve(nextValue);
//         break;
//       case MyPromise.rejected:
//         const nextReason = onRejected ? onRejected(this.reason) : this.value;
//         nextReject(nextReason);
//         break;
//     }
//   }

//   then(onFulfilled, onRejected) {
//     return new MyPromise((nextResolve, nextReject) => {
//       this.handler({
//         nextResolve,
//         nextReject,
//         onFulfilled,
//         onRejected
//       })
//     })
//   }
// }

// const p = new MyPromise((resolve, reject) => {
//   console.error()
//   resolve();
// });
// p.then(res => {

// }, reason => {

// })


// const pp = new Promise();
// pp.then(res => res, reason => reason);
