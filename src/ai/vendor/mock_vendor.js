/**
 * MockVendor provides a test double for AI service implementations
 */
export class MockVendor {
    #responses = {
        getChatModels: [],
        getEmbeddingModels: [],
        generate: [],
        embed: []
    };

    #calls = {
        getChatModels: [],
        getEmbeddingModels: [],
        generate: [],
        embed: []
    };

    /**
     * Set the response(s) for getChatModels
     * @param {Array<string>} models
     */
    setGetChatModelsResponse(models) {
        this.#responses.getChatModels.push(models);
    }

    /**
     * Set the response(s) for getEmbeddingModels
     * @param {Array<string>} models
     */
    setGetEmbeddingModelsResponse(models) {
        this.#responses.getEmbeddingModels.push(models);
    }

    /**
     * Set the response(s) for generate
     * @param {string | AsyncGenerator<string, string>} response
     */
    setGenerateResponse(response) {
        this.#responses.generate.push(response);
    }

    /**
     * Set the response(s) for embed
     * @param {{documentID: string, chunks: Array<Array<Number>>}} response
     */
    setEmbedResponse(response) {
        this.#responses.embed.push(response);
    }

    // Implementation methods that match the interface

    async getChatModels() {
        this.#calls.getChatModels.push({});
        return this.#responses.getChatModels.shift() ?? [];
    }

    async getEmbeddingModels() {
        this.#calls.getEmbeddingModels.push({});
        return this.#responses.getEmbeddingModels.shift() ?? [];
    }

    async generate(model, context, query, stream = false) {
        this.#calls.generate.push({model, context, query, stream});
        return this.#responses.generate.shift() ?? "";
    }

    async embed(model, documentID, chunks) {
        this.#calls.embed.push({model, documentID, chunks});
        return this.#responses.embed.shift() ?? {
            documentID,
            chunks: chunks.map(() => [0])
        };
    }

    // Methods for verifying calls in tests

    /**
     * Get all calls made to getChatModels
     */
    getChatModelsCalls() {
        return [...this.#calls.getChatModels];
    }

    /**
     * Get all calls made to getEmbeddingModels
     */
    getEmbeddingModelsCalls() {
        return [...this.#calls.getEmbeddingModels];
    }

    /**
     * Get all calls made to generate
     */
    getGenerateCalls() {
        return [...this.#calls.generate];
    }

    /**
     * Get all calls made to embed
     */
    getEmbedCalls() {
        return [...this.#calls.embed];
    }

    /**
     * Reset all calls and responses
     */
    reset() {
        this.#calls = {
            getChatModels: [],
            getEmbeddingModels: [],
            generate: [],
            embed: []
        };
        this.#responses = {
            getChatModels: [],
            getEmbeddingModels: [],
            generate: [],
            embed: []
        };
    }
}