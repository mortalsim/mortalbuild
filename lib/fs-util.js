const fs = require('fs');
const fglob = require('fast-glob');

module.exports = {
  ifNewerFile(targetFile, compareFile, callback, elseCallback, errCallback) {
    if(!elseCallback) elseCallback = ()=>{};
    if(!errCallback) errCallback = ()=>{};

    var tStat, cStat;

    fs.stat(targetFile, (err, stats) => {
      if(err) return errCallback(err);
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

  ifNewerInDir(targetDir, compareDir, callback, elseCallback, errCallback) {
    if(!elseCallback) elseCallback = ()=>{};
    if(!errCallback) errCallback = ()=>{};

    var tNewest, cNewest;

    this.getNewestFileDate(targetDir, (err, date) => {
      if(err) return errCallback(err);
      tNewest = date;
      if(cNewest !== undefined) compare();
    });

    this.getNewestFileDate(compareDir, (err, date) => {
      cNewest = date;
      if(tNewest !== undefined) compare();
    });

    function compare() {
      if(!tNewest || !cNewest || tNewest > cNewest) callback();
      else elseCallback();
    }
  },

  getOldestFileDate(dir, callback) {
    fglob(`${dir}/**`).then((files) => {
      // tomorrow's date
      var oldest = new Date(Date.now()+8.64e7);

      if(!files.length) {
        return callback(null, null);
      }

      var numChecked = 0;
      files.forEach((file)=> {
        fs.stat(file, (err, stats) => {
          if(err) return callback(err);
          if(stats.mtime < oldest) oldest = stats.mtime;
          if(++numChecked === files.length) callback(null, oldest);
        });
      });
    }).catch((err) => {
      callback(err, null);
    });
  },

  getNewestFileDate(dir, callback) {
    fglob(`${dir}/**`).then((files) => {
      var newest = new Date(0);

      if(!files.length) {
        return callback(new Error('No files in '+dir), null);
      }

      var numChecked = 0;
      files.forEach((file)=> {
        fs.stat(file, (err, stats) => {
          if(err) return callback(err);
          if(stats.mtime > newest) newest = stats.mtime;
          if(++numChecked === files.length) callback(null, newest);
        });
      });
    }).catch((err) => {
      callback(err, null);
    });
  }

};
