import { Suite } from '../../../test/quench';
import { Anthropic } from './anthropic';

Suite('ai.provider.anthropic', AnthropicProviderTest);
export default function AnthropicProviderTest({describe, it, assert, beforeEach, afterEach}) {
    let provider;
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        provider = new Anthropic({ apiKey: 'test-key' });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('initialization', () => {
        it('requires API key', () => {
            assert.throws(() => new Anthropic({}), /API key is required/);
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
                        models: [
                            {
                                id: 'model1',
                                capabilities: { completion: true, embedding: false }
                            },
                            {
                                id: 'model2',
                                capabilities: { completion: false, embedding: true }
                            },
                            {
                                id: 'model3',
                                capabilities: { completion: false, embedding: false }
                            }
                        ]
                    })
                };
            };
        });

        it('caches chat models', async () => {
            const models1 = await provider.getChatModels();
            const models2 = await provider.getChatModels();
            assert.deepEqual(models1, ['model1']);
            assert.deepEqual(models2, ['model1']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });

        it('caches embedding models', async () => {
            const models1 = await provider.getEmbeddingModels();
            const models2 = await provider.getEmbeddingModels();
            assert.deepEqual(models1, ['model2']);
            assert.deepEqual(models2, ['model2']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });
    });

    describe('generation', () => {
        /** @type {ContextDocument[]} */
        const context = [{
            id: 'test',
            title: 'Test Document',
            content: 'context text'
        }];
        const query = 'test query';

        it('generates non-streaming response', async () => {
            globalThis.fetch = async () => ({
                ok: true,
                json: async () => ({
                    content: [{ text: 'test response' }]
                })
            });

            const response = await provider.generate('claude-3-opus-20240229', context, query);
            assert.equal(response, 'test response');
        });

        it('handles generation errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400
            });

            try {
                await provider.generate('claude-3-opus-20240229', context, query);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'Anthropic API error: 400');
            }
        });

        it('generates streaming response', async () => {
            const chunks = [
                'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
                'data: {"type":"content_block_delta","delta":{"text":" world"}}\n\n'
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

            const stream = await provider.generate('claude-3-opus-20240229', context, query, true);
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
                    embedding: mockEmbedding
                })
            });

            /** @type {Chunk[]} */
            const chunks = ['chunk1', 'chunk2'];

            const result = await provider.embed(
                'claude-3-sonnet-20240229-embedding',
                'test-doc',
                chunks
            );

            assert.equal(result.id, 'test-doc');
            assert.deepEqual(result.vectors, [mockEmbedding, mockEmbedding]);
        });

        it('handles embedding errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400
            });

            try {
                await provider.embed(
                    'claude-3-sonnet-20240229-embedding',
                    'test-doc',
                    ['chunk']
                );
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'Anthropic API error: 400');
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
                    json: async () => ({content: [{text: ''}]})
                };
            };

            await provider.generate('claude-3-opus-20240229', [], 'test');

            assert.equal(capturedHeaders['x-api-key'], 'test-key');
            assert.equal(capturedHeaders['Content-Type'], 'application/json');
            assert.equal(capturedHeaders['anthropic-version'], '2023-06-01');
        });
    });
}
