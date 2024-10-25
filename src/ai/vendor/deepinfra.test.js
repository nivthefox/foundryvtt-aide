import { Suite } from '../../app/Quench';
import { DeepInfra } from './deepinfra';

Suite('ai.vendor.deepinfra', DeepInfraVendorTest);
export default function DeepInfraVendorTest({describe, it, assert, beforeEach, afterEach}) {
    let vendor;
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        vendor = new DeepInfra({ apiKey: 'test-key' });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('initialization', () => {
        it('requires API key', () => {
            assert.throws(() => new DeepInfra({}), /API key is required/);
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
                            { id: 'model1', type: 'text-generation' },
                            { id: 'model2', type: 'embedding' },
                            { id: 'model3', type: 'other' }
                        ]
                    })
                };
            };
        });

        it('caches chat models', async () => {
            const models1 = await vendor.getChatModels();
            const models2 = await vendor.getChatModels();
            assert.deepEqual(models1, ['model1']);
            assert.deepEqual(models2, ['model1']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });

        it('caches embedding models', async () => {
            const models1 = await vendor.getEmbeddingModels();
            const models2 = await vendor.getEmbeddingModels();
            assert.deepEqual(models1, ['model2']);
            assert.deepEqual(models2, ['model2']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });
    });

    describe('generation', () => {
        const context = [{ documentID: 'test', text: 'context text' }];
        const query = 'test query';

        it('generates non-streaming response', async () => {
            globalThis.fetch = async () => ({
                ok: true,
                json: async () => ({
                    results: [{
                        generated_text: 'test response'
                    }]
                })
            });

            const response = await vendor.generate('meta-llama/Llama-2-70b-chat', context, query);
            assert.equal(response, 'test response');
        });

        it('handles generation errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Bad request' })
            });

            try {
                await vendor.generate('meta-llama/Llama-2-70b-chat', context, query);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'DeepInfra API error: 400');
            }
        });

        it('generates streaming response', async () => {
            const chunks = [
                '{"token":{"text":"Hello"}}\n',
                '{"token":{"text":" world"}}\n'
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

            const stream = await vendor.generate('meta-llama/Llama-2-70b-chat', context, query, true);
            const received = [];
            for await (const chunk of stream) {
                received.push(chunk);
            }
            assert.deepEqual(received, ['Hello', ' world']);
        });
    });

    describe('embedding', () => {
        it('embeds document chunks', async () => {
            const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
            globalThis.fetch = async () => ({
                ok: true,
                json: async () => ({
                    embeddings: mockEmbeddings
                })
            });

            const result = await vendor.embed(
                'BAAI/bge-large-en-v1.5',
                'test-doc',
                ['chunk1', 'chunk2']
            );
            assert.equal(result.documentID, 'test-doc');
            assert.deepEqual(result.chunks, mockEmbeddings);
        });

        it('handles embedding errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Bad request' })
            });

            try {
                await vendor.embed('BAAI/bge-large-en-v1.5', 'test-doc', ['chunk']);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'DeepInfra API error: 400');
            }
        });
    });
}