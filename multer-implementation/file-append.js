import objectAssign from "object-assign";
function remove(arr, elm) {
    const index = arr.indexOf(elm);
    if (index !== -1) {
        arr.splice(index, 1);
    };
};

function fileAppender(strategy, req) {
    this.strategy = strategy;
    this.req = req;

    switch (strategy) {
        case 'none':
            break;
        case 'value':
            break;
        case 'array':
            req.files = [];
            break;
        case 'object':
            req.files = {};
            break;
        default:
            throw new Error(`Invalid strategy: ${strategy}`);
    };
};

fileAppender.prototype.insertPlaceholder = function (file) {
    const placeholder = {
        fieldname: file.fieldname
    };

    switch (this.strategy) {
        case 'none':
            break;
        case 'value':
            break;
        case 'array':
            this.req.files.push(placeholder);
            break;
        case 'object':
            if (this.req.files[file.fieldname]) {
                this.req.files[file.fieldname].push(placeholder)
              } else {
                this.req.files[file.fieldname] = [placeholder]
              }
            break
    };
    return placeholder;
};

fileAppender.prototype.removePlaceholder = function (placeholder) {
    switch (this.strategy) {
        case 'none':
            break;
        case 'value':
            break;
        case 'array':
            remove(this.req.files, placeholder);
            break;
        case 'object':
            if (this.req.files[placeholder.fieldname].length === 1) {
                delete this.req.files[placeholder.fieldname]
              } else {
                arrayRemove(this.req.files[placeholder.fieldname], placeholder)
              }
            break;
    };
};

fileAppender.prototype.replacePlaceholder = function (placeholder, file) {
    if (this.strategy === 'value') {
        this.req.files = file;
        return undefined;
    };
    delete placeholder.fieldname;
    objectAssign(placeholder, file);
};

export default fileAppender;
