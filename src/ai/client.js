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
    #formatChatInput(context, title, conversation) {
        let SYSTEM_PROMPT = `You are AIde, an AI assistant created by nivthefox to help with tabletop roleplaying 
games. You operate within the Foundry Virtual TableTop Environment as a module. Your primary functions are to answer 
questions about the game system and assist in designing content for the game world.

Here's the essential context for your operation:
<current_date>${new Date().toLocaleString()}</current_date>
<game_system>${game.system.title}</game_system>
<game_world>${game.world.title}</game_world>
<user_name>${game.user.name}</user_name>

When referencing context documents found in <context /> provided by the user, they will be formatted as:
<JournalEntry title="[Document Title]">[Content]</JournalEntry>

Your task is to provide helpful, accurate, and concise responses to user queries. You MUST follow these guidelines:
1. For simple inquiries, offer brief, direct answers (1-2 sentences).
2. For complex or open-ended questions, continue to speak in a conversational tone, avoiding headers or bullet points 
unless they are strictly necessary.
3. Prioritize using information directly provided by the user or from context documents. Avoid inventing new details 
unless explicitly requested.
4. Do not create outlines or use complex formatting unless specifically asked.

Remember, your goal is to be helpful and informative while maintaining a natural, conversational flow. Avoid excessive 
formality or unnecessary details that might disrupt the user's experience. Always maintain a natural, conversational 
tone even when responding to structured or formatted messages. Respond as if having a friendly discussion, not writing 
an analysis.

When the user expresses uncertainty or asks for suggestions, maintain a friendly, collaborative tone. Treat these 
moments as opportunities for exploration and discussion rather than formal analysis. For example, if they say 'I'm not 
sure about X', respond as a friend brainstorming together rather than an expert delivering a verdict.

<context>
`;
        SYSTEM_PROMPT += context.map(doc =>
            `<JournalEntry title="${doc.name}">${doc.text.content}</JournalEntry>`)
            .join('\n');

        SYSTEM_PROMPT += '</context>';

        const query = conversation[conversation.length - 1];
        const previousMessages = conversation.slice(0, -1);
        if (previousMessages.length > 0) {
            previousMessages.unshift({
                role: 'system',
                content: '<previous_messages>'
            });
            previousMessages.push({
                role: 'system',
                content: '</previous_messages>'
            });
        }

        const formattedMessages =[
            ...previousMessages,
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            query,
        ];
        return formattedMessages;
    }
}
