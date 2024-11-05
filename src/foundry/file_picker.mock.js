// Code generated automatically. DO NOT EDIT.
export class MockFilePicker {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockFilePickerRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    static async browse(source, path) {
        return await MockFilePicker.instance.browse(source, path);
    }

    static async createDirectory(source, path, options = {}) {
        return await MockFilePicker.instance.createDirectory(source, path, options);
    }

    static async upload(source, path, file, options = {}) {
        return await MockFilePicker.instance.upload(source, path, file, options);
    }

    async browse(source, path) {
        return await this.#ctrl.callAsync(this, 'browse', source, path);
    }

    async createDirectory(source, path, options = {}) {
        return await this.#ctrl.callAsync(this, 'createDirectory', source, path, options);
    }

    async upload(source, path, file, options = {}) {
        return await this.#ctrl.callAsync(this, 'upload', source, path, file, options);
    }

    /**
     * @private
     */
    static set instance(mock) {
        if (!(mock instanceof MockFilePicker)) {
            throw new Error('mock must be an instance of MockFilePicker');
        }
        MockFilePicker._instance = mock;
    }

    /**
     * @private
     */
    static get instance() {
        return MockFilePicker._instance;
    }
}

export class MockFilePickerRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockFilePicker)) {
            throw new Error('mock must be an instance of MockFilePicker');
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    browse(source, path) {
        return this.#ctrl.recordCall(this.#mock, 'browse', source, path);
    }

    createDirectory(source, path, options = {}) {
        return this.#ctrl.recordCall(this.#mock, 'createDirectory', source, path, options);
    }

    upload(source, path, file, options = {}) {
        return this.#ctrl.recordCall(this.#mock, 'upload', source, path, file, options);
    }
}
