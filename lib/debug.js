var config = require('../config.json');

function debug (type, obj) {
  if(config.debug[type]) {
    console.log("["+type+"] ", obj);
  }
}

module.exports = exports = debug;
