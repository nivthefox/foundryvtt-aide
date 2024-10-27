// Code generated automatically. DO NOT EDIT.
// source: github.com/nivthefox/aide/src/types.js

export class MockAIProvider {
    #ctrl;
    #recorder;

    constructor(ctrl) {
        this.#ctrl = ctrl;
        this.#recorder = new MockAIProviderRecorder(ctrl, this);
    }

    EXPECT() {
        return this.#recorder;
    }

    async getChatModels() {
        return await this.#ctrl.callAsync(this, "getChatModels");
    }

    async getEmbeddingModels() {
        return await this.#ctrl.callAsync(this, "getEmbeddingModels");
    }

    async generate(model, context, query, stream) {
        return await this.#ctrl.callAsync(this, "generate", model, context, query, stream);
    }

    async embed(model, id, chunks) {
        return await this.#ctrl.callAsync(this, "embed", model, id, chunks);
    }
}

export class MockAIProviderRecorder {
    #ctrl;
    #mock;

    constructor(ctrl, mock) {
        if (!(mock instanceof MockAIProvider)) {
            throw new Error("mock must be an instance of MockAIProvider");
        }
        this.#ctrl = ctrl;
        this.#mock = mock;
    }

    getChatModels() {
        return this.#ctrl.recordCall(this.#mock, "getChatModels");
    }

    getEmbeddingModels() {
        return this.#ctrl.recordCall(this.#mock, "getEmbeddingModels");
    }

    generate(model, context, query, stream) {
        return this.#ctrl.recordCall(this.#mock, "generate", model, context, query, stream);
    }

    embed(model, id, chunks) {
        return this.#ctrl.recordCall(this.#mock, "embed", model, id, chunks);
    }
}
