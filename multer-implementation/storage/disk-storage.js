import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { mkdirp } from 'mkdirp';

function getFileName(req, file, cb) {
    crypto.randomBytes(16, (err, raw) => {
        cb(err, err ? undefined : raw.toString('hex'));
    });
}

function getDestination(req, file, cb) {
    cb(null, os.tmpdir());
}

function diskStorage(opts) {
    this.getFileName = (opts.filename || getFileName);

    if (typeof opts.destination === 'string') {
        mkdirp.sync(opts.destination);
        this.getDestination = function ($0, $1, cb) {
            cb(null, opts.destination);
        };
    } else {
        this.getDestination = (opts.destination || getDestination);
    }
}

diskStorage.prototype.handleFileDisk = function (req, file, cb) {
    const that = this;

    that.getDestination(req, file, (err, destination) => {
        if (err) {
            return cb(err);
        }

        that.getFileName(req, file, (err, filename) => {
            if (err) {
                return cb(err);
            }

            const finalPath = path.join(destination, filename);
            const outStream = fs.createWriteStream(finalPath);

            outStream.on('error', (writeErr) => {
                fs.unlink(finalPath, () => {
                    cb(writeErr);
                });
            });

            outStream.on('finish', () => {
                cb(null, {
                    destination: destination,
                    filename: filename,
                    path: finalPath,
                    size: outStream.bytesWritten
                });
            });

            file.stream.pipe(outStream);
        });
    });
}

diskStorage.prototype.removeFileDisk = function (req, file, cb) {
    const filePath = file.path;

    delete file.destination;
    delete file.filename;
    delete file.path;

    fs.unlink(filePath, cb);
}

export default function (opts) {
    return new diskStorage(opts);
}
