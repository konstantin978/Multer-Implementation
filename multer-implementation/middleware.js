// const is = require('type-is');
// const busboy = require('busboy');
// const extend = require('xtend');
// // const appendField = require('append-field');
// import appendField from 'append-field';

// const counter = require('./counter');
// const multerErr = require('./errors');
// const removeFiles = require('./remove-file');
// const fileAppender = require('./file-append');

import is from 'type-is';
import Busboy from 'busboy';
import extend from 'xtend';
import appendField from 'append-field';

import counter from './counter.js';
import multerErr from './errors.js';
import removeFiles from './remove-file.js';
import fileAppender from './file-append.js';

function middleware(setup) {
    return function (req, res, next) {
        const options = setup();

        const limits = options.limits;
        const storage = options.storage;
        const fileFilter = options.fileFilter;
        const fileStrategy = options.fileStrategy;
        const preservePath = options.preservePath;

        req.body = {};

        var busboy;

        try {
            busboy = Busboy({ headers: req.headers, limits: limits, preservePath: preservePath });
        } catch (err) {
            return next(err);
        };

        const appender = new fileAppender(fileStrategy, req);
        let done = false;
        let read = false;
        let error = false;
        const mainCounter = new counter();
        const uploadedFiles = [];

        function completed(err) {
            if (done) {
                return undefined;
            };

            done = true;
            req.unpipe(busboy);
            busboy.removeAllListeners();
            next(err);
        };

        function indicateCompleate() {
            if (read && mainCounter.equalZero() && !error) {
                completed();
            };
        };

        function abortWithErr(uploadError) {
            if (error) {
                return undefined;
            };

            error = true;

            mainCounter.onceZero(() => {

                function remove(file, cb) {
                    storage._removeFile(req, file, cb);
                };

                removeFiles(uploadedFiles, remove, (err, storageErrors) => {
                    if (err) {
                        return completed(err);
                    };

                    uploadError.storageErrors = storageErrors;
                    completed(uploadError);
                });

            });
        };

        function abortWithCode(code, optionalField) {
            abortWithErr(new multerErr(code, optionalField));
        };

        busboy.on('field', function (fieldname, value, { nameTruncated, valueTruncated }) {
            if (fieldname == null) {
                return abortWithCode('MISSING_FIELD_NAME');
            }
            if (nameTruncated) {
                return abortWithCode('LIMIT_FIELD_KEY');
            }
            if (valueTruncated) {
                return abortWithCode('LIMIT_FIELD_VALUE', fieldname);
            }

            if (limits && Object.prototype.hasOwnProperty.call(limits, 'fieldNameSize')) {
                if (fieldname.length > limits.fieldNameSize) return abortWithCode('LIMIT_FIELD_KEY');
            }

            appendField(req.body, fieldname, value);
        });

        busboy.on('file', function (fieldname, fileStream, { filename, encoding, mimeType }) {
            if (!filename) {
                return fileStream.resume();
            };

            if (limits && Object.prototype.hasOwnProperty.call(limits, 'fieldNameSize')) {
                if (fieldname.length > limits.fieldNameSize) {
                    return abortWithCode('LIMIT_FIELD_KEY');
                };
            };

            const file = {
                fieldname: fieldname,
                originalname: filename,
                encoding: encoding,
                mimetype: mimeType
            };

            const placeholder = appender.insertPlaceholder(file);

            fileFilter(req, file, function (err, includeFile) {
                if (err) {
                  appender.removePlaceholder(placeholder)
                  return abortWithErr(err)
                }
        
                if (!includeFile) {
                  appender.removePlaceholder(placeholder)
                  return fileStream.resume()
                }
        
                var aborting = false
                mainCounter.inc()
        
                Object.defineProperty(file, 'stream', {
                  configurable: true,
                  enumerable: false,
                  value: fileStream
                })
        
                fileStream.on('error', function (err) {
                  mainCounter.dec()
                  abortWithErr(err)
                })
        
                fileStream.on('limit', function () {
                  aborting = true
                  abortWithCode('LIMIT_FILE_SIZE', fieldname)
                })
        
                storage.handleFileDisk(req, file, function (err, info) {
                  if (aborting) {
                    appender.removePlaceholder(placeholder)
                    uploadedFiles.push(extend(file, info))
                    return mainCounter.dec()
                  }
        
                  if (err) {
                    appender.removePlaceholder(placeholder)
                    mainCounter.dec()
                    return abortWithErr(err)
                  }
        
                  var fileInfo = extend(file, info)
        
                  appender.replacePlaceholder(placeholder, fileInfo)
                  uploadedFiles.push(fileInfo)
                  mainCounter.dec()
                  indicateCompleate()
                })
              })
        });

        busboy.on('error', (err) => {
            abortWithErr(err);
        });
        busboy.on('partsLimit', () => {
            abortWithCode('LIMIT_PART_COUNT');
        });
        busboy.on('filesLimit', () => {
            abortWithCode('LIMIT_FILE_COUNT');
        });
        busboy.on('fieldsLimit', () => {
            abortWithCode('LIMIT_FIELD_COUNT');
        });
        busboy.on('close', () => {
            read = true;
            indicateCompleate();
        });

        req.pipe(busboy)
    };
};

export default middleware