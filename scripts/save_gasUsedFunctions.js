const fs = require("fs");

module.exports = function (network, deployed) {
  //console.log('save ', network, deployed);

  if (!fs.existsSync(`TOSV2_gasUsedFunctions.${network}.json`)) {
    fs.writeFileSync(`TOSV2_gasUsedFunctions.${network}.json`, '{}', { flag: 'w' }, function (err) {
      if (err) throw err;
    });
  }

  let data = JSON.parse(fs.readFileSync(`TOSV2_gasUsedFunctions.${network}.json`).toString());
  data[deployed.name] = deployed.tx;

  //console.log('data[deployed.name]', deployed.name, data[deployed.name]);

  fs.writeFileSync(`TOSV2_gasUsedFunctions.${network}.json`, JSON.stringify(data, null, 2))
}