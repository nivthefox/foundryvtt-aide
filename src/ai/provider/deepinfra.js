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
     * @returns {Promise<string> | GenerateStream}
     */
    async generate(model, context, query, stream = false) {
        const controller = new AbortController();

        const response = await fetch(`${this.#baseUrl}/chat/completions`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: query,
                temperature: 0.7,
                top_p: 0.9,
                top_k: 0,
                presence_penalty: 0.0,
                frequency_penalty: 0.0,
                stream
            })
        });

        if (!response.ok) {
            throw new Error(`DeepInfra API error: ${response.status}`);
        }

        if (stream) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            return {
                [Symbol.asyncIterator]: async function* () {
                    try {
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
                                    } catch (e) {
                                    }
                                }
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }
                },
                abort: () => controller.abort()
            }
        } else {
            const data = await response.json();
            return data.choices[0].message.content;
        }
    }

    /**
     * @param {string} model
     * @param {string} id
     * @param {Chunk[]} inputs
     * @returns {Promise<EmbeddingDocument>}
     */
    async embed(model, id, inputs) {
        const data = {
            id,
            vectors: []
        };

        for (const input of inputs) {
            const response = await fetch(`${this.#baseUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.#apiKey}`
                },
                body: JSON.stringify({input, model})
            });

            if (!response.ok) {
                throw new Error(`DeepInfra API error: ${response.status}`);
            }

            const output = await response.json();
            data.vectors.push(output.data[0].embedding);
        }

        return data;
    }
}
