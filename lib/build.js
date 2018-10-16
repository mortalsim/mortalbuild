const fs = require('fs');
const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');
const fglob = require('fast-glob');
const fsUtil = require('./fs-util.js');
const cmdLog = require('./cmd-log.js');
const ExecPool = require('./exec-pool.js');

var pool = new ExecPool(os.cpus().length);

module.exports = function build(opts) {

  if(!opts.cmdLog) opts.cmdLog = cmdLog;
  if(!opts.execPool) opts.execPool = pool;

  return function build() {
    return new Promise((resolve, reject) => {
      // fast-glob doesn't always preserve order... which we need
      // here, so run each glob in sequence
      fglob(opts.src).then((entries) => {

        if(opts.srcSort) {
          entries.sort(opts.srcSort);
        }

        if(opts.targetDir) {
          runMultiBuild(opts, entries, (err) => {
            if(err) reject();
            resolve();
          });
        }
        else {
          runBuild(opts, entries, (err) => {
            if(err) reject();
            resolve();
          });
        }
      });
    });
  };
};

function runMultiBuild(opts, entries, callback) {
  if(!entries) return callback();

  var pool = opts.execPool;
  var buildDef = opts.buildDef;
  var targetDir = opts.targetDir;
  var execOpts = opts.execOpts || {};

  var numPending = entries.length;

  entries.forEach((srcPath) => {
    var targetPath = `${targetDir}/${path.basename(srcPath).replace(/\.[^/.]+$/, buildDef.ext)}`;


    // Create the target directory if it doesn't already exist
    mkdirp(path.dirname(targetPath), () => {

      if(opts.forceRun) {
        runCmd();
      }
      else {
        // only process if the src file is newer than the object file
        fsUtil.ifNewerFile(srcPath, targetPath, runCmd, () => {
          // Target file is older than source file
          // If we've completed all pending commands, resolve the promise
          if(--numPending == 0) callback();
        });
      }

      function runCmd() {
        var cmd = getBuildCommand(buildDef, srcPath, targetPath, opts);

        pool.queueCmd(cmd, execOpts, (err, stdout, stderr) => {
          opts.cmdLog(cmd, err, stdout, stderr);
          if(err) callback(err);
          // If we've completed all pending commands, resolve the promise
          if(--numPending == 0) callback();
        });
      }
    });
  });
}

function runBuild(opts, entries, callback) {
  if(!entries) return callback();

  var pool = opts.execPool;
  var buildDef = opts.buildDef;
  var target = opts.target + buildDef.ext;
  var execOpts = opts.execOpts || {};

  var numChecked = 0;
  var checkDone = false;

  checkEntries();

  function checkEntries() {
    entries.forEach((entry) => {

      if(opts.forceRun) {
        checkComplete(true);
      }
      else {
        fsUtil.ifNewerFile(entry, target, () => {
          // the source file is newer
          checkComplete(true);
        }, () => {
          numChecked++;
          checkComplete();
        });
      }
    });
  }

  function checkComplete(doRun) {
    if(!checkDone && doRun) {
      // Run the command and indicate that it's already been run
      // so if more callbacks are triggered we don't run it again
      checkDone = true;
      runCmd();
    }
    else if(numChecked === entries.length) {
      // No files were newer, so just call the callback
      callback();
    }
  }

  function runCmd() {
    mkdirp(path.dirname(target), () => {
      var cmd = getBuildCommand(buildDef, entries.join(' '), target, opts);
      pool.queueCmd(cmd, execOpts, (err, stdout, stderr) => {
        opts.cmdLog(cmd, err, stdout, stderr);
        if(err) callback(err);
        else callback();
      });
    });
  }
}

function getBuildCommand(def, src, target, opts) {
  /* eslint-disable no-unused-vars */
  // ^ They will be used in the evaluated template
  var cmd = def.cmd;
  var source = src;
  var target = target;
  var args = '';

  if(typeof def.args === 'string') {
    args = def.args;
  }
  else if(def.args) {
    args = def.args.all || '';
    if(opts.dev && def.args.dev) {
      if(Array.isArray(def.args.dev)){
        args += ' ' + def.args.dev.join(' ');
      }
      else {
        args += ' ' + def.args.dev;
      }
    }
    else if(def.args.prod){
      if(Array.isArray(def.args.prod)){
        args += ' ' + def.args.prod.join(' ');
      }
      else {
        args += ' ' + def.args.prod;
      }
    }
    if(opts.test) {
      if(Array.isArray(def.args.test)) {
        args += ' ' + def.args.test.join(' ');
      }
      else {
        args += ' ' + def.args.test;
      }
    }
  }
  return eval('`'+def.tpl+'`');
}
