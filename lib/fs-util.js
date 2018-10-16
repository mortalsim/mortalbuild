const fs = require('fs');

module.exports = {
  ifNewerFile(targetFile, compareFile, callback, elseCallback) {
    if(!elseCallback) elseCallback = ()=>{};

    var tStat, cStat;

    fs.stat(targetFile, (err, stats) => {
      if(err) throw err;
      tStat = stats;
      compare();
    });
    fs.stat(compareFile, (err, stats) => {
      if(err) {
        if(err.code == 'ENOENT') return callback();
        throw err;
      }
      cStat = stats;
      compare();
    });

    function compare() {
      if(tStat && cStat) {
        if(tStat.mtime > cStat.mtime) {
          callback();
        }
        else {
          elseCallback();
        }
      }
    }
  }

};
