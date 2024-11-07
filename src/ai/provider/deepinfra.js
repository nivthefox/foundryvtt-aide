/**
 * DeepInfra provides AI capabilities using DeepInfra's model hosting
 * @implements {AIProvider}
 */
export class DeepInfra {
    #apiKey = null;
    #baseUrl = 'https://api.deepinfra.com/v1/openai';
    #chatModels = null;
    #embeddingModels = null;

    /**
     * @param {AIProviderSettings} config
     */
    constructor(config) {
        this.#apiKey = config.apiKey;
    }

    /**
     * @returns {Promise<string[]>}
     */
    async getChatModels() {
        if (this.#chatModels !== null) {
            return this.#chatModels;
        }

        const response = await fetch(`${this.#baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${this.#apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`DeepInfra API error: ${response.status}`);
        }

        const data = await response.json();
        this.#chatModels = data.data
            .filter(model => !model.id.toLowerCase().includes('embed'))
            .map(model => model.id)
            .sort((a, b) => a.localeCompare(b));
        return this.#chatModels;
    }

    /**
     * @returns {Promise<string[]>}
     */
    async getEmbeddingModels() {
        // todo: temporarily hardcoded since there's no way to get the embedding
        //       models from the API
        return [
            'BAAI/bge-base-en-v1.5',
            'BAAI/bge-large-en-v1.5',
            'BAAI/bge-m3',
            'intfloat/e5-base-v2',
            'intfloat/e5-large-v2',
            'intfloat/multilingual-e5-large',
            'sentence-transformers/all-MiniLM-L12-v2',
            'sentence-transformers/all-MiniLM-L6-v2',
            'sentence-transformers/all-mpnet-base-v2',
            'sentence-transformers/clip-ViT-B-32',
            'sentence-transformers/clip-ViT-B-32-multilingual-v1',
            'sentence-transformers/multi-qa-mpnet-base-dot-v1',
            'sentence-transformers/paraphrase-MiniLM-L6-v2',
            'shibing624/text2vec-base-chinese',
            'thenlper/gte-base',
            'thenlper/gte-large',
        ].sort((a, b) => a.localeCompare(b));

        // if (this.#embeddingModels !== null) {
        //     return this.#embeddingModels;
        // }
        //
        // const response = await fetch(`${this.#baseUrl}/models`, {
        //     headers: {
        //         'Authorization': `Bearer ${this.#apiKey}`
        //     }
        // });
        //
        // if (!response.ok) {
        //     throw new Error(`DeepInfra API error: ${response.status}`);
        // }
        //
        // const data = await response.json();
        // this.#embeddingModels = data.data
        //     .filter(model => model.id.toLowerCase().includes('embed'))
        //     .map(model => model.id);
        //
        // return this.#embeddingModels;
    }

    /**
     * @param {string} model
     * @param {ContextDocument[]} context
     * @param {ConversationMessage[]} query
     * @param {boolean} [stream=false]
     * @returns {Promise<string> | AsyncGenerator<string, string>}
     */
    async generate(model, context, query, stream = false) {
        const response = await fetch(`${this.#baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: this.#formatChatInput(context, query),
                stream
            })
        });

        if (!response.ok) {
            throw new Error(`DeepInfra API error: ${response.status}`);
        }

        if (stream) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            return (async function* () {
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        if (line === 'data: [DONE]') {
                            continue;
                        }

                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.choices?.[0]?.delta?.content) {
                                    yield data.choices[0].delta.content;
                                }
                            }
                            catch (e) {}
                        }
                    }
                }
            })();
        } else {
            const data = await response.json();
            return data.choices[0].message.content;
        }
    }

    /**
     * @param {string} model
     * @param {string} id
     * @param {Chunk[]} chunks
     * @returns {Promise<EmbeddingDocument>}
     */
    async embed(model, id, chunks) {
        const response = await fetch(`${this.#baseUrl}/${model}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`
            },
            body: JSON.stringify({
                inputs: chunks
            })
        });

        if (!response.ok) {
            throw new Error(`DeepInfra API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            id,
            vectors: data.embeddings
        };
    }

    /**
     * Formats context and query for the chat model
     * @private
     * @param {ContextDocument[]} context
     * @param {ConversationMessage[]} query
     * @returns {ConversationMessage[]}
     */
    #formatChatInput(context, query) {
        return [
            {
                'role': 'system',
                'content': `You are a helpful AI assistant named AIde, running within the FoundryVTT environment.

<synopsis>
The user is running the following game system: ${game.system.title}
The user is running the following game world: ${game.world.title}
The user's name is: ${game.user.name}
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
