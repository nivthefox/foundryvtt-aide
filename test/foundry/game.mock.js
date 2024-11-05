export class MockGame {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockGameRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    get journal() {
        return this.#ctrl.call(this, 'journal');
    }
}

export class MockGameRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockGame)) {
            throw new Error("mock must be an instance of MockGame");
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    get journal() {
        return this.#ctrl.recordPropertyCall(this.#mock, 'journal');
    }
}
