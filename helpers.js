const moment = require("moment");

let helpers = {
  get_names_from_url: function (url) {
    let filename = url;
    let protocol_regexp = /^https?:\/\/?(.*)$/ig;
    if (match = protocol_regexp.exec(filename)) {
      filename = match[1];
    }
    if (filename.lastIndexOf('/') == filename.length - 1) {
      filename = filename.substring(0, filename.length - 1);
    }
    let exploded_filename = filename.split('/');
    if (exploded_filename.length > 1) {
      filename = exploded_filename.pop();
    }
    else {
      filename = 'index';
    }
    let dirname = exploded_filename.join('/');
    return { 'dirname': dirname, 'filename': filename }
  },
  log: function (message) {
    let date = moment().format("DD/MM/YYYY HH:mm:ss");
    console.log(`${date}: ${message}`);
  }
}

module.exports = helpers;