const fs = require('fs')

module.exports = function (prefix, name) {
  let data = JSON.parse(fs.readFileSync(`deployed.${prefix}.json`).toString());

  return data[name];
}