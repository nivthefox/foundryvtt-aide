import { Suite } from '../../app/quench';
import { OpenAI } from './openai';

Suite('ai.provider.openai', OpenAIProviderTest);
export default function OpenAIProviderTest({describe, it, assert, beforeEach, afterEach}) {
    let provider;
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        provider = new OpenAI({ apiKey: 'test-key' });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('initialization', () => {
        it('requires API key', () => {
            assert.throws(() => new OpenAI({}), /OpenAI API key is required/);
        });

        it('allows custom base URL', async () => {
            let capturedUrl;
            globalThis.fetch = async (url, options) => {
                capturedUrl = url;
                return {
                    ok: true,
                    json: async () => ({
                        data: []
                    })
                };
            };

            const customProvider = new OpenAI({
                apiKey: 'test-key',
                baseURL: 'https://custom.openai.api/v1'
            });

            await customProvider.getChatModels();
            assert.equal(capturedUrl, 'https://custom.openai.api/v1/models');
        });
    });

    describe('model listing', () => {
        let fetchCount = 0;

        beforeEach(() => {
            fetchCount = 0;
            globalThis.fetch = async () => {
                fetchCount++;
                return {
                    ok: true,
                    json: async () => ({
                        data: [
                            { id: 'gpt-4' },
                            { id: 'gpt-3.5-turbo' },
                            { id: 'text-embedding-3-small' },
                            { id: 'text-embedding-3-large' },
                            { id: 'dall-e-3' }
                        ]
                    })
                };
            };
        });

        it('caches chat models', async () => {
            const models1 = await provider.getChatModels();
            const models2 = await provider.getChatModels();
            assert.deepEqual(models1, ['gpt-4', 'gpt-3.5-turbo']);
            assert.deepEqual(models2, ['gpt-4', 'gpt-3.5-turbo']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });

        it('caches embedding models', async () => {
            const models1 = await provider.getEmbeddingModels();
            const models2 = await provider.getEmbeddingModels();
            assert.deepEqual(models1, ['text-embedding-3-small', 'text-embedding-3-large']);
            assert.deepEqual(models2, ['text-embedding-3-small', 'text-embedding-3-large']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });
    });

    describe('generation', () => {
        /** @type {ContextDocument[]} */
        const context = [{
            id: 'test',
            title: 'Test Document',
            content: 'test context'
        }];
        const query = 'test query';

        it('generates non-streaming response', async () => {
            globalThis.fetch = async () => ({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: 'test response'
                        }
                    }]
                })
            });

            const response = await provider.generate('gpt-4', context, query);
            assert.equal(response, 'test response');
        });

        it('handles generation errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: { message: 'Bad request' } })
            });

            try {
                await provider.generate('gpt-4', context, query);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'OpenAI API error: 400');
            }
        });

        it('generates streaming response', async () => {
            const chunks = [
                'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
                'data: {"choices":[{"delta":{"content":" world"}}]}\n\n'
            ];

            let chunkIndex = 0;
            globalThis.fetch = async () => ({
                ok: true,
                body: {
                    getReader: () => ({
                        read: async () => {
                            if (chunkIndex >= chunks.length) {
                                return { done: true };
                            }
                            const chunk = chunks[chunkIndex++];
                            return {
                                done: false,
                                value: new TextEncoder().encode(chunk)
                            };
                        }
                    })
                }
            });

            const stream = await provider.generate('gpt-4', context, query, true);
            const received = [];
            for await (const chunk of stream) {
                received.push(chunk);
            }
            assert.deepEqual(received, ['Hello', ' world']);
        });
    });

    describe('embedding', () => {
        it('embeds document chunks', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];
            globalThis.fetch = async () => ({
                ok: true,
                json: async () => ({
                    data: [{
                        embedding: mockEmbedding
                    }]
                })
            });

            /** @type {Chunk[]} */
            const chunks = ['chunk1', 'chunk2'];

            const result = await provider.embed(
                'text-embedding-3-small',
                'test-doc',
                chunks
            );

            assert.equal(result.id, 'test-doc');
            assert.deepEqual(result.vectors, [mockEmbedding, mockEmbedding]);
        });

        it('handles embedding errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: { message: 'Bad request' } })
            });

            try {
                await provider.embed(
                    'text-embedding-3-small',
                    'test-doc',
                    ['chunk']
                );
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'OpenAI API error: 400');
            }
        });
    });

    describe('API requests', () => {
        it('sets correct headers', async () => {
            let capturedHeaders;
            globalThis.fetch = async (url, options) => {
                capturedHeaders = options.headers;
                return {
                    ok: true,
                    json: async () => ({
                        choices: [{
                            message: {
                                content: ''
                            }
                        }]
                    })
                };
            };

            await provider.generate('gpt-4', [], 'test');

            assert.equal(capturedHeaders['Authorization'], 'Bearer test-key');
            assert.equal(capturedHeaders['Content-Type'], 'application/json');
        });
    });
}
