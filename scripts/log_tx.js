require('dotenv').config()
const gasUsedFunctions = require("./save_gasUsedFunctions");

function printGasUsedOfUnits(filename,  _fun, _tx){

  if( _tx != null && (
      (_tx.deployTransaction != null && _tx.deployTransaction.hash!=null)
      || _tx.hash !=null )
    ) {
    let name =  _fun;
    let hash = _tx.hash;

    if(_tx.deployTransaction != null && _tx.deployTransaction.hash!=null) hash = _tx.deployTransaction.hash;


    let data = {name:name, tx:hash};

    // deployed_functions.push(_fun);
    // deployed_gasUsed.push(_tx.gasUsed);
    // console.log("printGasUsedOfUnits data ", data);

    gasUsedFunctions(filename, data);
  }
}

module.exports = {printGasUsedOfUnits}