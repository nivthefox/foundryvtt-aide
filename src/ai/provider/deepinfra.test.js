import { Suite } from '../../../test/quench';
import { DeepInfra } from './deepinfra';

Suite('ai.provider.deepinfra', DeepInfraProviderTest);
export default function DeepInfraProviderTest({describe, it, assert, beforeEach, afterEach}) {
    let provider;
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        provider = new DeepInfra({ apiKey: 'test-key' });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
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
                            {id: 'text-chat-model1'},
                            {id: 'text-chat-model2'},
                            {id: 'text-embed-model3'},
                        ]
                    })
                };
            };
        });

        it('caches chat models', async () => {
            const models1 = await provider.getChatModels();
            const models2 = await provider.getChatModels();
            assert.deepEqual(models1, ['text-chat-model1', 'text-chat-model2']);
            assert.deepEqual(models2, ['text-chat-model1', 'text-chat-model2']);
            assert.equal(fetchCount, 1, 'Should only fetch once');
        });

        // fixme: disabled since there's no way to get the embedding models from the API
        //       they are temporarily hardcoded in the provider
        // it('caches embedding models', async () => {
        //     const models1 = await provider.getEmbeddingModels();
        //     const models2 = await provider.getEmbeddingModels();
        //     assert.deepEqual(models1, ['text-embed-model3']);
        //     assert.deepEqual(models2, ['text-embed-model3']);
        //     assert.equal(fetchCount, 1, 'Should only fetch once');
        // });
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
                    results: [{
                        generated_text: 'test response'
                    }]
                })
            });

            const response = await provider.generate('meta-llama/Llama-2-70b-chat', context, query);
            assert.equal(response, 'test response');
        });

        it('handles generation errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Bad request' })
            });

            try {
                await provider.generate('meta-llama/Llama-2-70b-chat', context, query);
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

            const stream = await provider.generate('meta-llama/Llama-2-70b-chat', context, query, true);
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

            /** @type {Chunk[]} */
            const chunks = ['chunk1', 'chunk2'];

            const result = await provider.embed(
                'BAAI/bge-large-en-v1.5',
                'test-doc',
                chunks
            );

            assert.equal(result.id, 'test-doc');
            assert.deepEqual(result.vectors, mockEmbeddings);
        });

        it('handles embedding errors', async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Bad request' })
            });

            try {
                await provider.embed(
                    'BAAI/bge-large-en-v1.5',
                    'test-doc',
                    ['chunk']
                );
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'DeepInfra API error: 400');
            }
        });
    });
}
