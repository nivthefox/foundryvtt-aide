/**
 * Client provides AI capabilities including text embedding and chat generation.
 *
 * @description
 * The client handles communication with the AI service API, converting between
 * raw text and vector representations for semantic search, and generating
 * contextual chat responses.
 *
 * Documents are embedded as fixed-dimension vectors suitable for similarity
 * comparisons. Chat generation incorporates relevant context to produce
 * targeted responses.
 *
 * Supports multiple AI vendors through a common interface.
 *
 * @example
 * ```javascript
  * const client = Client.create("deepinfra", {apiKey: "my-api-key"});
 *
 * // Embedding documents
 * const documentChunks = ["chunk1 text", "chunk2 text"];
 * const vectors = await client.embed("bge-large-en", "doc1", documentChunks);
 *
 * // Generating responses
 * const context = [
 *   { documentID: "doc1", text: "relevant context" }
 * ];
 *
 * // Standard generation
 * const response = await client.generate("wizardLM-2-8x22B", context, "user query");
 *
 * // Streaming generation
 * const stream = await client.generate("wizardLM-2-8x22B", context, "user query", true);
 * if (stream[Symbol.asyncIterator]) {
 *   for await (const token of stream) {
 *     console.log(token); // Process tokens as they arrive
 *   }
 * }
 * ```
 */
export class Client {
    #implementation = null;

    /**
     * @private
     * @param {AIImplementation} implementation
     */
    constructor(implementation) {
        if (!implementation) {
            throw new Error('Direct construction is not supported. Use Client.create() instead.');
        }
        this.#implementation = implementation;
    }

    /**
     * Create a new AI client
     *
     * @param {string} vendor
     * @param {Object} configuration
     * @returns {Client}
     */
    static create(vendor, configuration) {
        const implementation = Client.#createImplementation(vendor, configuration);
        return new Client(implementation);
    }

    /**
     * getChatModels retrieves available chat models from the AI service
     * @returns {Promise<Array<string>>}
     */
    async getChatModels() {
        return this.#implementation.getChatModels();
    }

    /**
     * getEmbeddingModels retrieves available embedding models from the AI service
     * @returns {Promise<Array<string>>}
     */
    async getEmbeddingModels() {
        return this.#implementation.getEmbeddingModels();
    }

    /**
     * Generate creates a chat response based on the query and provided context
     *
     * @param {string} model
     * @param {Array<{documentID: string, text: string}>} context
     * @param {string} query
     * @param {boolean} [stream=false]
     * @returns Promise<{string} | AsyncGenerator<string, string>}
     */
    async generate(model, context, query, stream= false) {
        return this.#implementation.generate(model, context, query, stream);
    }

    /**
     * Embed a document into a vector representation
     *
     * @param {string} model
     * @param {string} documentID
     * @param {Array<string>} chunks
     * @returns Promise<{documentID: string, chunks: Array<Array<Number>>}>
     */
    async embed(model, documentID, chunks) {
        return this.#implementation.embed(model, documentID, chunks);
    }

    static #createImplementation(vendor, configuration) {
        switch (vendor.toLowerCase()) {
            default:
                throw new Error(`Unsupported vendor: ${vendor}`);
        }
    }
}
