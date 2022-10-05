const fs = require("fs");

module.exports = function (prefix, deployed) {
  //console.log('save ', network, deployed);

  if (!fs.existsSync(`deployed.${prefix}.json`)) {
    fs.writeFileSync(`deployed.${prefix}.json`, '{}', { flag: 'w' }, function (err) {
      if (err) throw err;
    });
  }

  let data = JSON.parse(fs.readFileSync(`deployed.${prefix}.json`).toString());
  data[deployed.name] = deployed.address;

  //console.log('data[deployed.name]', deployed.name, data[deployed.name]);

  fs.writeFileSync(`deployed.${prefix}.json`, JSON.stringify(data, null, 2))
}