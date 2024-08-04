import middleware from './middleware.js';
import diskStorage from './storage/disk-storage.js';
import memoryStorage from './storage/memory-storage.js';
import multerErr from './errors.js';

function allowAll(req, file, cb) {
    cb(null, true);
};

function multer(options) {
    if (options.storage) {
        this.storage = options.storage;
    } else if (options.dest) {
        this.storage = diskStorage({ destination: options.dest });
    } else {
        this.storage = memoryStorage();
    };

    this.limits = options.limits;
    this.preservePath = options.preservePath;
    this.fileFilter = options.fileFilter || allowAll;
};

multer.prototype.makeMiddleware = function (fields, fileStrategy) {
    function setup() {
        const fileFilter = this.fileFilter;
        const filesLeft = {};

        fields.forEach(function (field) {
            if (typeof field.maxCount === 'number') {
                filesLeft[field.name] = field.maxCount;
            } else {
                filesLeft[field.name] = Infinity;
            };
        });

        function wrappedFileFilter (req, file, cb) {
            if ((filesLeft[file.fieldname] || 0) <= 0) {
              return cb(new multerErr('LIMIT_UNEXPECTED_FILE', file.fieldname))
            }
    
            filesLeft[file.fieldname] -= 1
            fileFilter(req, file, cb)
          }

        return {
            limits: this.limits,
            preservePath: this.preservePath,
            storage: this.storage,
            fileFilter: wrappedFileFilter,
            fileStrategy: fileStrategy
        };
    };

    return middleware(setup.bind(this));
};

multer.prototype.single = function (name) {
    return this.makeMiddleware([{ name: name, maxCount: 1 }], 'value');
};

multer.prototype.array = function (name, maxCount) {
    return this.makeMiddleware([{ name: name, maxCount: maxCount }], 'array');
};

multer.prototype.fields = function (fields) {
    return this.makeMiddleware(fields, 'object');
};

multer.prototype.none = function () {
    return this.makeMiddleware([], 'none');
};

multer.prototype.any = function () {
    function setup() {
        return {
            limits: this.limits,
            preservePath: this.preservePath,
            storage: this.storage,
            fileFilter: this.fileFilter,
            fileStrategy: 'array'
        };
    };

    return middleware(setup.bind(this));
};

function multer2(options) {
    if (options === undefined) {
        return new multer({});
    };

    if (typeof options === 'object' && options !== null) {
        return new multer(options);
    };
    throw new Error('Expected object for argument options');
};

export default multer2;

export { diskStorage, memoryStorage, multerErr };


