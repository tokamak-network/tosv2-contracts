const fs = require("fs");

module.exports = function (filename, deployed) {
  console.log('save ', filename, deployed);

  if (!fs.existsSync(`TOSV2.${filename}.tx.json`)) {
    fs.writeFileSync(`TOSV2.${filename}.tx.json`, '{}', { flag: 'w' }, function (err) {
      if (err) throw err;
    });
  }

  let data = JSON.parse(fs.readFileSync(`TOSV2.${filename}.tx.json`).toString());
  data[deployed.name] = deployed.tx;

  // console.log('data', deployed);
  // console.log('data[deployed.name]', deployed.name, data[deployed.name]);

  fs.writeFileSync(`TOSV2.${filename}.tx.json`, JSON.stringify(data, null, 2))
}