export class MockSettings {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockSettingsRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    get(namespace, key) {
        return this.#ctrl.call(this, "get", namespace, key);
    }

    register(namespace, key, data) {
        return this.#ctrl.call(this, "register", namespace, key, data);
    }

    registerMenu(namespace, key, data) {
        return this.#ctrl.call(this, "registerMenu", namespace, key, data);
    }

    set(namespace, key, value, options) {
        return this.#ctrl.call(this, "set", namespace, key, value, options);
    }
}

export class MockSettingsRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockSettings)) {
            throw new Error("mock must be an instance of MockSettings");
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    get(namespace, key) {
        return this.#ctrl.recordCall(this.#mock, "get", namespace, key);
    }

    register(namespace, key, data) {
        return this.#ctrl.recordCall(this.#mock, "register", namespace, key, data);
    }

    registerMenu(namespace, key, data) {
        return this.#ctrl.recordCall(this.#mock, "registerMenu", namespace, key, data);
    }

    set(namespace, key, value, options) {
        return this.#ctrl.recordCall(this.#mock, "set", namespace, key, value, options);
    }
}
