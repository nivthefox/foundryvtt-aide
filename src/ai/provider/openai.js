/**
 * OpenAI provides AI capabilities using OpenAI's models
 * @implements {AIProvider}
 */
export class OpenAI {
    #apiKey = null;
    #baseUrl = 'https://api.openai.com/v1';
    #chatModels = null;
    #embeddingModels = null;

    /**
     * @param {AIProviderConfig} config
     */
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.#apiKey = config.apiKey;

        if (config.baseURL) {
            this.#baseUrl = config.baseURL;
        }
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
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        this.#chatModels = data.data
            .filter(model => model.id.startsWith('gpt-'))
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
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        this.#embeddingModels = data.data
            .filter(model => model.id.startsWith('text-embedding-'))
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
        const messages = [
            {
                role: 'system',
                content: `You are a helpful AI assistant. Use this context to answer the user's question:
${context.map(doc => `# ${doc.title}\n${doc.content}`).join('\n\n')}`
            },
            { role: 'user', content: query }
        ];

        const response = await fetch(`${this.#baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                stream
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
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
                            if (data.choices?.[0]?.delta?.content) {
                                yield data.choices[0].delta.content;
                            }
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
        const responses = await Promise.all(
            chunks.map(chunk =>
                fetch(`${this.#baseUrl}/embeddings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.#apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        input: chunk
                    })
                }).then(async r => {
                    if (!r.ok) {
                        throw new Error(`OpenAI API error: ${r.status}`);
                    }
                    const data = await r.json();
                    return data.data[0].embedding;
                })
            )
        );

        return {
            id,
            vectors: responses
        };
    }
}