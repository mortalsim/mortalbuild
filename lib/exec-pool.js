const os = require('os');
const EventEmitter = require('events');
const { exec } = require('child_process');

class ExecPool extends EventEmitter {
  constructor(concurrency) {
    super();
    this.queue = [];
    this.execList = [];
    this.concurrency = concurrency || os.cpus().length;
  }
  queueCmd() {
    if(this.execList.length < this.concurrency) {
      this.exec(...arguments);
    }
    else {
      this.queue.push(arguments);
    }
  }
  exec() {
    var childProcess = exec(...arguments);
    var _this = this;
    childProcess.on('exit', () => {
      _this.execList.splice(_this.execList.indexOf(childProcess), 1);
      if(_this.queue.length) {
        _this.exec(..._this.queue.shift());
      }
    });
    this.execList.push(childProcess);
  }
}

module.exports = ExecPool;
