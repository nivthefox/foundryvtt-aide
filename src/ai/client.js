// import {Anthropic} from './provider/anthropic.js';
import {DeepInfra} from './provider/deepinfra.js';
import {OpenAI} from './provider/openai';

/**
 * Client provides AI capabilities including text embedding and chat generation.
 * @implements {AIProvider}
 *
 * @description
 * The client handles communication with the AI service provider, converting
 * between raw text and vector representations for semantic search, and
 * generating contextual chat responses.
 *
 * Documents are embedded as fixed-dimension vectors suitable for similarity
 * comparisons. Chat generation incorporates relevant context to produce
 * targeted responses.
 *
 * Supports multiple AI providers through a common interface.
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
 *   { id: "doc1", title: "Title", content: "relevant context" }
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
    /** @type {AIProvider} */
    #implementation = null;

    /**
     * @private
     * @param {AIProvider} implementation
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
     * @param {AIProviderSettings} settings
     * @returns {Client}
     */
    static create(settings) {
        const implementation = Client.#createImplementation(settings);
        return new Client(implementation);
    }

    /**
     * getChatModels retrieves available chat models from the AI service
     * @returns {Promise<string[]>}
     */
    async getChatModels() {
        return this.#implementation.getChatModels();
    }

    /**
     * getEmbeddingModels retrieves available embedding models from the AI service
     * @returns {Promise<string[]>}
     */
    async getEmbeddingModels() {
        return this.#implementation.getEmbeddingModels();
    }

    /**
     * Generate creates a chat response based on the query and provided context
     *
     * @param {string} model
     * @param {ContextDocument[]} context
     * @param {string} title
     * @param {ConversationMessage[]} query
     * @param {boolean} [stream=false]
     * @returns {Promise<string> | AsyncGenerator<string, string>}
     */
    async generate(model, context, title, query, stream = false) {
        query = this.#formatChatInput(context, title, query);
        return this.#implementation.generate(model, context, query, stream);
    }

    /**
     * Embed a document into a vector representation
     *
     * @param {string} model
     * @param {string} id
     * @param {Chunk[]} chunks
     * @returns {Promise<EmbeddingDocument>}
     */
    async embed(model, id, chunks) {
        return this.#implementation.embed(model, id, chunks);
    }

    /**
     * @private
     * @param {AIProviderSettings} settings
     * @returns {AIProvider}
     */
    static #createImplementation(settings) {
        switch (settings.provider.toLowerCase()) {
            case 'anthropic':
                throw new Error('Unsupported provider: Anthropic');
                // disabled temporarily as Anthropic does not support embeddings
                // todo: re-enable when Anthropic supports embeddings or when we
                //       have the ability to separate the chat and embedding
                //       providers
                // return new Anthropic(configuration);
            case 'deepinfra':
                return new DeepInfra(settings);
            case 'openai':
                return new OpenAI(settings);
            default:
                throw new Error(`Unsupported provider: ${settings.provider}`);
        }
    }

    /**
     * Formats context and query for the chat model
     * @private
     * @param {ContextDocument[]} context
     * @param {string} title
     * @param {ConversationMessage[]} query
     * @returns {ConversationMessage[]}
     */
    #formatChatInput(context, title, query) {
        return [
            {
                role: 'system',
                content: `You are a helpful AI assistant named AIde, running within the FoundryVTT environment.

<synopsis>
The user is running the following game system: ${game.system.title}
The user is running the following game world: ${game.world.title}
The user's name is: ${game.user.name}
The title of this conversation is: ${title}
The current time is: ${new Date().toLocaleString()} 
</synopsis>

<formatting>
Use markdown to add emphasis and structure to your messages:
- **bold**
- _italic_
- [links](https://example.com)
- \`code\`
- > quotes
- Lists with bullets like this list
- Headers with #, ##, ###, etc.
</formatting>

<context>
Use this context to answer the user's question:
${context.map(doc => `# ${doc.title}\n${doc.content}`).join('\n\n')}
</context>`
            },
            ...query
        ];
    }

}
