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


    get game() {
        const self = this;
        return {
            get journal() {
                return self.gameJournal;
            }
        }
    }

    get gameJournal() {
        return this.ctrl.call(this, "gameJournal");
    }
}

/**
 * MockFoundryRecorder records expectations for the MockFoundry
 * @implements {MockRecorder}
 */
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

    get game() {
        const ctrl = this.ctrl;
        const mock = this.mock;

        return {
            get journal() {
                return ctrl.recordPropertyCall(mock, "gameJournal");
            }
        }
    }
}

