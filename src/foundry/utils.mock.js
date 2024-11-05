export class MockUtils {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockUtilsRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    randomID() {
        return this.#ctrl.call(this, 'randomID');
    }
}

export class MockUtilsRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockUtils)) {
            throw new Error('mock must be an instance of MockUtils');
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    randomID() {
        return this.#ctrl.recordCall(this.#mock, 'randomID');
    }
}
