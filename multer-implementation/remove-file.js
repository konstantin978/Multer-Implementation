function removeFiles(uplFiles, remove, cb) {
    const length = uplFiles.length;
    const errors = [];

    if (length === 0) {
        return cb(null, errors);
    };

    function handleFile(id) {
        const file = uplFiles[id];

        remove(file, (err) => {
            if (err) {
                err.file = file;
                err.field = file.fieldname;
                errors.push(err);
            };

            if (id < length - 1) {
                handleFile(++id);
            } else {
                cb(null, errors);
            };
        });
    };

    handleFile(0);
};

export default removeFiles;