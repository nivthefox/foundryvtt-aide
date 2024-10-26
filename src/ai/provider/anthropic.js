/**
 * Anthropic provides AI capabilities using Anthropic's Claude models
 * @implements {AIProvider}
 */
export class Anthropic {
    #apiKey = null;
    #baseUrl = 'https://api.anthropic.com/v1';
    #chatModels = null;
    #embeddingModels = null;

    /**
     * @param {AIProviderConfig} config
     */
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('Anthropic API key is required');
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
                'x-api-key': this.#apiKey,
                'anthropic-version': '2023-06-01'
            }
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        this.#chatModels = data.models
            .filter(model => model.capabilities.completion)
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
                'x-api-key': this.#apiKey,
                'anthropic-version': '2023-06-01'
            }
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        this.#embeddingModels = data.models
            .filter(model => model.capabilities.embedding)
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
        const systemPrompt = `You are a helpful AI assistant. Use this context to answer the user's question:
${context.map(doc => `# ${doc.title}\n${doc.content}`).join('\n\n')}`;

        const messages = [
            { role: 'user', content: query }
        ];

        const response = await fetch(`${this.#baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.#apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                messages,
                system: systemPrompt,
                stream
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
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
                        if (line.startsWith('data: ')) {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'content_block_delta' && data.delta?.text) {
                                yield data.delta.text;
                            }
                        }
                    }
                }
            })();
        } else {
            const data = await response.json();
            return data.content[0].text;
        }
    }

    /**
     * @param {string} model
     * @param {string} id
     * @param {Chunk[]} chunks
     * @returns {Promise<EmbeddingDocument>}
     */
    async embed(model, id, chunks) {
        const responses = await Promise.all(
            chunks.map(chunk =>
                fetch(`${this.#baseUrl}/embeddings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.#apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model,
                        input: chunk
                    })
                }).then(async r => {
                    if (!r.ok) {
                        throw new Error(`Anthropic API error: ${r.status}`);
                    }
                    const response = await r.json();
                    return response.embedding;
                })
            )
        );

        return {
            id,
            vectors: responses
        };
    }
}
