export class MockSocket {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockSocketRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    emit(event, data, options, callback) {
        return this.#ctrl.call(this, 'emit', event, data, options, callback);
    }

    on(event, listener) {
        return this.#ctrl.call(this, 'on', event, listener);
    }
}

export class MockSocketRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockSocket)) {
            throw new Error('mock must be an instance of MockSocket');
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    emit(event, data, options, callback) {
        return this.#ctrl.recordCall(this.#mock, 'emit', event, data, options, callback);
    }

    on(event, listener) {
        return this.#ctrl.recordCall(this.#mock, 'on', event, listener);
    }
}
