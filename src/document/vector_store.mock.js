// Code generated automatically. DO NOT EDIT.
// source: github.com/nivthefox/aide/src/document/vector_store.js

export class MockVectorStore {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockVectorStoreRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    add(document) {
        return this.#ctrl.call(this, 'add', document);
    }

    addBatch(documents) {
        return this.#ctrl.call(this, 'addBatch', documents);
    }

    clear() {
        return this.#ctrl.call(this, 'clear');
    }

    delete(id) {
        return this.#ctrl.call(this, 'delete', id);
    }

    findSimilar(queryVectors) {
        return this.#ctrl.call(this, 'findSimilar', queryVectors);
    }

    size() {
        return this.#ctrl.call(this, 'size');
    }

    stats() {
        return this.#ctrl.call(this, 'stats');
    }
}

export class MockVectorStoreRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockVectorStore)) {
            throw new Error('mock must be an instance of MockVectorStore');
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    add(document) {
        return this.#ctrl.recordCall(this.#mock, 'add', document);
    }

    addBatch(documents) {
        return this.#ctrl.recordCall(this.#mock, 'addBatch', documents);
    }

    clear() {
        return this.#ctrl.recordCall(this.#mock, 'clear');
    }

    delete(id) {
        return this.#ctrl.recordCall(this.#mock, 'delete', id);
    }

    findSimilar(queryVectors) {
        return this.#ctrl.recordCall(this.#mock, 'findSimilar', queryVectors);
    }

    size() {
        return this.#ctrl.recordCall(this.#mock, 'size');
    }

    stats() {
        return this.#ctrl.recordCall(this.#mock, 'stats');
    }
}
