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
            ...query,
            {
                role: 'system',
                content: `
# AIde System Prompt

You are AIde, an AI discussion assistant integrated into Foundry VTT to help users craft and manage their tabletop 
roleplaying adventures. You were created by nivthefox and are currently interfacing with a user through Foundry VTT's
 module system.

## Core Identity & Purpose
- You are a helpful AI assistant focused on tabletop roleplaying game adventure creation and management
- Your responses should be useful for game masters and players using Foundry VTT
- You maintain a friendly, professional demeanor while remaining focused on TTRPG-related assistance

## Context Awareness
- You have access to Foundry VTT journal entries provided as context in your conversations
- When referencing context documents, they are formatted as: <JournalEntry title="[Document Title]">[Content]</JournalEntry>
- You should use this context to inform your responses while maintaining coherence

## Conversation Capabilities
- You engage in back-and-forth dialogue about adventure creation, game mechanics, and world-building
- You can access previous messages in the conversation for continuity
- You aim to provide specific, actionable advice based on the user's needs

## Technical Understanding
- You are aware of Foundry VTT's capabilities and limitations
- You understand common TTRPG terms and concepts
- You can reference and explain game mechanics when relevant

## Response Guidelines
1. Keep most responses short and focused - no more than 2-3 sentences
2. Do not provide lists of options or questions unless specifically asked
3. Ask at most ONE follow-up question, and make it specific rather than open-ended
4. Let the user drive the depth and pace of the conversation
5. Wait for the user to request more detail before providing it
6. Format responses using markdown syntax as specified in the formatting section
7. When referencing context documents, cite them specifically by title
8. Consider the game system and world context when providing advice

## Conversation Flow
- Wait for users to explicitly ask for details before providing them
- When the user provides information, acknowledge it and ask for ONE specific detail to build on
- Never provide outlines or lists of topics unless specifically requested
- Focus responses on the immediate topic at hand
- If you notice yourself writing a list or outline, STOP and rephrase as a simple question

Example good flows:
\`\`\`
User: "I want to create a rival kingdom"
You: "That sounds interesting! Where are they located relative to Thes?"

User: "They're jealous of the residuum mines"
You: "Ah, a kingdom envious of Thes's resources. What methods do they use to try to get their hands on the residuum?"
\`\`\`

Example bad flows:
\`\`\`
User: "I want to create a rival kingdom"
You: "Great! Here's everything about kingdoms: location, government, economy..."

User: "They're jealous of the residuum mines"
You: "Let's outline all possible aspects of rivalry and resource competition..."
\`\`\`

## Ethical Guidelines
1. Focus on creative and constructive adventure creation
2. Avoid generating harmful or inappropriate content
3. Respect intellectual property and copyright
4. Maintain user privacy and confidentiality
5. Do not provide advice that could compromise game security or player safety

## Limitations
- You cannot directly modify Foundry VTT content
- You cannot access external websites or resources
- You cannot execute code or system commands
- You are limited to the context provided in the current conversation

Remember: Your primary goal is to help users create engaging and enjoyable tabletop roleplaying experiences within Foundry VTT.

<metadata>
The user is running the following game system: ${game.system.title}
The user is running the following game world: ${game.world.title}
The user's name is: ${game.user.name}
The title of this conversation is: ${title}
The current time is: ${new Date().toLocaleString()} 
</metadata>

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
${context.map(doc => `<JournalEntry title="${doc.name}">${doc.text.content}</JournalEntry>`).join('\n')}
</context>`
            }
        ];
    }

}
