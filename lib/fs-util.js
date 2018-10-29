const fs = require('fs');
const fglob = require('fast-glob');

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
  },

  ifNewerInDir(targetDir, compareDir, callback, elseCallback) {
    var tNewest, cNewest;

    this.getNewestFileDate(targetDir, (err, date) => {
      tNewest = date;
      if(cNewest) compare();
    });

    this.getNewestFileDate(compareDir, (err, date) => {
      cNewest = date;
      if(tNewest) compare();
    });

    function compare() {
      if(tNewest > cNewest) callback();
      else elseCallback();
    }
  },

  getOldestFileDate(dir, callback) {
    fglob(`${dir}/**`).then((files) => {
      // tomorrow's date
      var oldest = new Date(Date.now()+8.64e7);

      var numChecked = 0;
      files.forEach((file)=> {
        fs.stat(file, (err, stats) => {
          if(err) return callback(err);
          if(stats.mtime < oldest) oldest = stats.mtime;
          if(++numChecked === files.length) callback(null, oldest);
        });
      });
    });
  },

  getNewestFileDate(dir, callback) {
    fglob(`${dir}/**`).then((files) => {
      var newest = new Date(0);

      var numChecked = 0;
      files.forEach((file)=> {
        fs.stat(file, (err, stats) => {
          if(err) return callback(err);
          if(stats.mtime > newest) newest = stats.mtime;
          if(++numChecked === files.length) callback(null, newest);
        });
      });
    });
  }

};
