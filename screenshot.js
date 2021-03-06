#!/usr/bin/env node

const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const execute = require('sync-exec');
const mkdirp = require('mkdirp');
const helpers = require('./helpers.js');
const config = require('./config.json');
const args = require('args');

args
  .option('file', 'File with urls list to taking screenshots', 'sitemap.xml');
 
const flags = args.parse(process.argv);

if (cluster.isMaster) {
  let site_regexp = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&#\/%=~_|$?!:,.]*\)|[A-Z0-9+&#\/%=~_|$])/ig
  let screenshots_pool = [];
  let workers = [];
  let screenshots_count, executed_count = 0;
  helpers.log(`Master ${process.pid} is running`);
  fs.readFile(flags.file, 'utf8', function (err, contents) {
    if (err !== null) {
      helpers.log(err.toString());
      process.exit(1);
    }
    else {
      helpers.log(`File ${flags.file} loaded`);
    }
    while (url = site_regexp.exec(contents)) {
      if (url[0].endsWith('.png') || url[0].endsWith('.jpg') || url[0].endsWith('.js') || url[0].endsWith('.css') || RegExp(config.blacklist_urls).test(url)) continue;
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
      helpers.log(`${message} (${executed_count}/${screenshots_count})`);
    });
    cluster.on('exit', (worker, code, signal) => {
      helpers.log(`Worker ${worker.process.pid} died`);
    });
  });
} else {
  helpers.log(`Worker ${process.pid} started`);
  process.on('message', function (message) {
    let {dirname, filename} = helpers.get_names_from_url(message);
    mkdirp(dirname);
    let ex = execute(`npm run page2image -- ${message} --named="${dirname}/${filename}"`);
    let ex_output = /(save.*?)$/msg.exec(ex.stdout)[0];
    process.send(`Worker ${process.pid} ${ex_output}`);
  });
}