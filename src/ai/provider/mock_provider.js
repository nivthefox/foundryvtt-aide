/**
 * MockProvider provides a test double for AI service implementations
 * @implements {AIProvider}
 */
export class MockProvider {
    /** @type {{ getChatModels: any[], getEmbeddingModels: any[], generate: any[], embed: any[] }} */
    #responses = {
        getChatModels: [],
        getEmbeddingModels: [],
        generate: [],
        embed: []
    };

    /** @type {{ getChatModels: any[], getEmbeddingModels: any[], generate: any[], embed: any[] }} */
    #calls = {
        getChatModels: [],
        getEmbeddingModels: [],
        generate: [],
        embed: []
    };

    /**
     * Set the response(s) for getChatModels
     * @param {string[]} models
     */
    setGetChatModelsResponse(models) {
        this.#responses.getChatModels.push(models);
    }

    /**
     * Set the response(s) for getEmbeddingModels
     * @param {string[]} models
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
     * @param {EmbeddingDocument} response
     */
    setEmbedResponse(response) {
        this.#responses.embed.push(response);
    }

    // Implementation methods that match the interface

    /**
     * @returns {Promise<string[]>}
     */
    async getChatModels() {
        this.#calls.getChatModels.push({});
        return this.#responses.getChatModels.shift() ?? [];
    }

    /**
     * @returns {Promise<string[]>}
     */
    async getEmbeddingModels() {
        this.#calls.getEmbeddingModels.push({});
        return this.#responses.getEmbeddingModels.shift() ?? [];
    }

    /**
     * @param {string} model
     * @param {ContextDocument[]} context
     * @param {string} query
     * @param {boolean} [stream=false]
     * @returns {Promise<string> | AsyncGenerator<string, string>}
     */
    async generate(model, context, query, stream = false) {
        this.#calls.generate.push({model, context, query, stream});
        return this.#responses.generate.shift() ?? "";
    }

    /**
     * @param {string} model
     * @param {string} id
     * @param {Chunk[]} chunks
     * @returns {Promise<EmbeddingDocument>}
     */
    async embed(model, id, chunks) {
        this.#calls.embed.push({model, id, chunks});
        return this.#responses.embed.shift() ?? {
            id,
            vectors: chunks.map(() => [0]) // Now just returns array of number[]
        };
    }

    // Methods for verifying calls in tests

    /**
     * Get all calls made to getChatModels
     * @returns {any[]}
     */
    getChatModelsCalls() {
        return [...this.#calls.getChatModels];
    }

    /**
     * Get all calls made to getEmbeddingModels
     * @returns {any[]}
     */
    getEmbeddingModelsCalls() {
        return [...this.#calls.getEmbeddingModels];
    }

    /**
     * Get all calls made to generate
     * @returns {{
     *   model: string,
     *   context: ContextDocument[],
     *   query: string,
     *   stream: boolean
     * }[]}
     */
    getGenerateCalls() {
        return [...this.#calls.generate];
    }

    /**
     * Get all calls made to embed
     * @returns {{
     *   model: string,
     *   id: string,
     *   chunks: Chunk[]
     * }[]}
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
