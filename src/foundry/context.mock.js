export class MockContext {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockWindowRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    async fetch(url, options) {
        return await this.#ctrl.callAsync(this, 'fetch', url, options);
    }

    async fromUuid(id) {
        return await this.#ctrl.callAsync(this, 'fromUuid', id);
    }

    get foundry() {
        return this.#ctrl.call(this, 'foundry');
    }
}

export class MockWindowRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockContext)) {
            throw new Error('mock must be an instance of MockContext');
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    fetch(url, options) {
        return this.#ctrl.recordCall(this.#mock, 'fetch', url, options);
    }

    fromUuid(id) {
        return this.#ctrl.recordCall(this.#mock, 'fromUuid', id);
    }

    get foundry() {
        return this.#ctrl.recordPropertyCall(this.#mock, 'foundry');
    }
}
