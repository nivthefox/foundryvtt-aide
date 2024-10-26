/**
 * DeepInfra provides AI capabilities using DeepInfra's model hosting
 * @implements {AIProvider}
 */
export class DeepInfra {
    #apiKey = null;
    #baseUrl = 'https://api.deepinfra.com/v1/inference';
    #chatModels = null;
    #embeddingModels = null;

    /**
     * @param {AIProviderConfig} config
     */
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('DeepInfra API key is required');
        }
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
        this.#chatModels = data.models
            .filter(model => model.type === 'text-generation')
            .map(model => model.id);

        return this.#chatModels;
    }

    /**
     * @returns {Promise<string[]>}
     */
    async getEmbeddingModels() {
        if (this.#embeddingModels !== null) {
            return this.#embeddingModels;
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
        this.#embeddingModels = data.models
            .filter(model => model.type === 'embedding')
            .map(model => model.id);

        return this.#embeddingModels;
    }

    /**
     * @param {string} model
     * @param {ContextDocument[]} context
     * @param {string} query
     * @param {boolean} [stream=false]
     * @returns {Promise<string> | AsyncGenerator<string, string>}
     */
    async generate(model, context, query, stream = false) {
        const response = await fetch(`${this.#baseUrl}/${model}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`
            },
            body: JSON.stringify({
                input: this.#formatChatInput(context, query),
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
                        try {
                            const data = JSON.parse(line);
                            if (data.token?.text) {
                                yield data.token.text;
                            }
                        } catch (e) {
                            // Skip malformed lines
                        }
                    }
                }
            })();
        } else {
            const data = await response.json();
            return data.results[0].generated_text;
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
     * @param {string} query
     * @returns {string}
     */
    #formatChatInput(context, query) {
        return `Context:
${context.map(doc => `# ${doc.title}\n${doc.content}`).join('\n\n')}

Question: ${query}`;
    }
}
