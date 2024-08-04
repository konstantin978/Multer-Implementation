import concat from 'concat-stream';

function memoryStorage (opts) {};

memoryStorage.prototype.handleFileMemory = function (req, file, cb) {
  file.stream.pipe(concat({ encoding: 'buffer' }, (data) => {
    cb(null, {
      buffer: data,
      size: data.length
    });
  }));
};

memoryStorage.prototype.removeFileMemory = function (req, file, cb) {
  delete file.buffer;
  cb(null);
};

export default function (opts) {
  return new memoryStorage(opts);
};
