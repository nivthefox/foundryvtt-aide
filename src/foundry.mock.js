export class MockFoundry {
    ctrl;
    #recorder;

    constructor(ctrl) {
        this.ctrl = ctrl;
        this.#recorder = new MockFoundryRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    async fromUuid(id) {
        return await this.ctrl.callAsync(this, "fromUuid", id);
    }

    get foundry() {
        return this.ctrl.call(this, "foundry");
    }

    get game() {
        const self = this;
        return {
            get journal() {
                return self.gameJournal;
            },
            get settings() {
                return {
                    get(namespace, key) {
                        return self.ctrl.call(self, "game.settings.get", namespace, key);
                    },
                    register(namespace, key, data) {
                        return self.ctrl.call(self, "game.settings.register", namespace, key, data);
                    }
                }
            }
        }
    }

    get gameJournal() {
        return this.ctrl.call(this, "gameJournal");
    }
}

export class MockFoundryRecorder {
    ctrl;
    mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockFoundry)) {
            throw new Error("mock must be an instance of MockFoundry");
        }
        this.ctrl = ctrl;
        this.mock = mock;
    }

    fromUuid(id) {
        return this.ctrl.recordCall(this.mock, "fromUuid", id);
    }

    get foundry() {
        return this.ctrl.recordPropertyCall(this.mock, "foundry");
    }

    get game() {
        const ctrl = this.ctrl;
        const mock = this.mock;

        return {
            get journal() {
                return ctrl.recordPropertyCall(mock, "gameJournal");
            },
            get settings() {
                return {
                    get(namespace, key) {
                        return ctrl.recordCall(mock, "game.settings.get", namespace, key);
                    },
                    register(namespace, key, data) {
                        return ctrl.recordCall(mock, "game.settings.register", namespace, key, data);
                    }
                }
            }
        }
    }
}
