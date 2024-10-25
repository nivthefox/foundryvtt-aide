/**
 * DeepInfra provides AI capabilities using DeepInfra's model hosting
 */
export class DeepInfra {
    #apiKey = null;
    #baseUrl = 'https://api.deepinfra.com/v1/inference';
    #chatModels = null;
    #embeddingModels = null;

    /**
     * @param {Object} config
     * @param {string} config.apiKey - DeepInfra API key
     */
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('DeepInfra API key is required');
        }
        this.#apiKey = config.apiKey;
    }

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
     * @param {Array<{documentID: string, text: string}>} context
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
     * @param {string} documentID
     * @param {Array<string>} chunks
     * @returns {Promise<{documentID: string, chunks: Array<Array<Number>>}>}
     */
    async embed(model, documentID, chunks) {
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
            documentID,
            chunks: data.embeddings
        };
    }

    /**
     * Formats context and query for the chat model
     * @private
     */
    #formatChatInput(context, query) {
        // This will need to be adjusted based on the specific model being used
        return `Context:\n${context.map(c => c.text).join('\n\n')}\n\nQuestion: ${query}`;
    }
}