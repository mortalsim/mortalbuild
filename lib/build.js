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

      // if this is windows, and the target ext is empty,
      // the build may have produced a .exe file, so we'll
      // check for it here just in case.
      if(process.platform === 'win32' && buildDef.ext === '') {
        if(!fs.existsSync(targetPath) && fs.existsSync(targetPath+'.exe')){
          targetPath = targetPath+'.exe';
        }
      }

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

  // if this is windows, and the target ext is empty,
  // the build may have produced a .exe file, so we'll
  // check for it here just in case.
  if(process.platform === 'win32' && buildDef.ext === '') {
    if(!fs.existsSync(target) && fs.existsSync(target+'.exe')){
      target = target+'.exe';
    }
  }

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

function getBuildCommand(def, src, tgt, opts) {
  /* eslint-disable no-unused-vars */
  // ^ They will be used in the evaluated template
  var cmd = def.cmd;
  var source = src;
  var target = tgt;
  var args = '';
  var includes = '';

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
    if(opts.test && def.args.test) {
      if(Array.isArray(def.args.test)) {
        args += ' ' + def.args.test.join(' ');
      }
      else {
        args += ' ' + def.args.test;
      }
    }
  }
  if(typeof def.includes === 'string') {
    includes = def.includes;
  }
  else if(Array.isArray(def.includes)) {
    includes += ' ' + def.incl + def.includes.join(' '+def.incl);
  }
  else if(def.includes && def.incl) {
    includes = def.includes.all ? def.incl+def.includes.all : '';
    if(opts.dev && def.includes.dev) {
      if(Array.isArray(def.includes.dev)){
        includes += ' ' + def.incl + def.includes.dev.join(' '+def.incl);
      }
      else {
        includes += ' ' + def.incl + def.includes.dev;
      }
    }
    else if(def.includes.prod){
      if(Array.isArray(def.includes.prod)){
        includes += ' ' + def.incl + def.includes.prod.join(' '+def.incl);
      }
      else {
        includes += ' ' + def.incl + def.includes.prod;
      }
    }
    if(opts.test) {
      if(Array.isArray(def.includes.test)) {
        includes += ' ' + def.incl + def.includes.test.join(' '+def.incl);
      }
      else {
        includes += ' ' + def.incl + def.includes.test;
      }
    }
  }
  return eval('`'+def.tpl+'`');
}
