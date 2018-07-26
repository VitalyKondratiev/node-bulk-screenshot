let fs = require('fs');
var moment = require("moment")
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
let execute = require('sync-exec');

let moment_log = function (message) {
  let date = moment().format("DD/MM/YYYY HH:mm:ss");
  console.log(`${date}: ${message}`);
};

if (cluster.isMaster) {
  let site_regexp = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&#\/%=~_|$?!:,.]*\)|[A-Z0-9+&#\/%=~_|$])/ig
  let screenshots_pool = [];
  let workers = [];
  let screenshots_count, executed_count = 0;
  moment_log(`Master ${process.pid} is running`);
  fs.readFile('sitemap.xml', 'utf8', function (err, contents) {
    let dbg_limit = 0;
    while (url = site_regexp.exec(contents)) {
      if (dbg_limit++ > 10) break;
      if (url[0].endsWith('.png') || url[0].endsWith('.jpg') || url[0].endsWith('.js') || url[0].endsWith('.css')) continue;
      screenshots_pool.push(url[0]);
    };
    screenshots_count = screenshots_pool.length;
    for (let i = 0; i < numCPUs; i++) {
      workers.push(cluster.fork());
    }
    if (workers.length) {
      let current_worker = 0;
      while (screenshots_pool.length) {
        let screenshot_current = screenshots_pool.pop();
        workers[current_worker].send(screenshot_current);
        current_worker++;
        if (current_worker >= workers.length) {
          current_worker = 0;
        }
      }
      workers.forEach(worker => {
        worker.kill();
      });
    }
    cluster.on('message', (worker, message, handle) => {
      executed_count++;
      moment_log(`${message} (${executed_count}/${screenshots_count})`);
    });
    cluster.on('exit', (worker, code, signal) => {
      moment_log(`Worker ${worker.process.pid} died`);
    });
  });
} else {
  moment_log(`Worker ${process.pid} started`);
  process.on('message', function (message) {
    let ex = execute(`npm run page2image -- ${message}`);
    let ex_output = /(save.*?)$/msg.exec(ex.stdout)[0];
    process.send(`Worker ${process.pid} ${ex_output}`);
  });
}