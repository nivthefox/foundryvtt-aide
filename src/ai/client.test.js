import { Suite } from '../app/quench';
import { Client } from './client';
import { MockProvider } from './provider/mock_provider';

Suite('ai.client', ClientTest);
export default function ClientTest({describe, it, assert, beforeEach}) {
    let mock;
    let client;

    beforeEach(() => {
        mock = new MockProvider();
        client = new Client(mock);
    });

    describe('model listing', () => {
        it('retrieves chat models', async () => {
            const expected = ['model1', 'model2'];
            mock.setGetChatModelsResponse(expected);

            const result = await client.getChatModels();
            assert.deepEqual(result, expected);
            assert.equal(mock.getChatModelsCalls().length, 1);
        });

        it('retrieves embedding models', async () => {
            const expected = ['embed1', 'embed2'];
            mock.setGetEmbeddingModelsResponse(expected);

            const result = await client.getEmbeddingModels();
            assert.deepEqual(result, expected);
            assert.equal(mock.getEmbeddingModelsCalls().length, 1);
        });
    });

    describe('document embedding', () => {
        it('embeds document chunks', async () => {
            const id = 'doc1';
            /** @type {Chunk[]} */
            const chunks = ['chunk1', 'chunk2'];
            /** @type {EmbeddingDocument} */
            const mockResponse = {
                id,
                vectors: [[1, 2], [3, 4]]
            };
            mock.setEmbedResponse(mockResponse);

            const result = await client.embed('model1', id, chunks);

            const calls = mock.getEmbedCalls();
            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0], {
                model: 'model1',
                id,
                chunks
            });
            assert.deepEqual(result, mockResponse);
        });
    });

    describe('chat generation', () => {
        /** @type {ContextDocument[]} */
        const context = [{
            id: 'doc1',
            title: 'Test Document',
            content: 'test context'
        }];
        const query = 'test query';

        it('generates non-streaming response', async () => {
            const expected = 'test response';
            mock.setGenerateResponse(expected);

            const result = await client.generate('model1', context, query);

            const calls = mock.getGenerateCalls();
            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0], {
                model: 'model1',
                context,
                query,
                stream: false
            });
            assert.equal(result, expected);
        });

        it('generates streaming response', async () => {
            const tokens = ['Hello', ' ', 'world'];
            const generator = (async function* () {
                for (const token of tokens) {
                    yield token;
                }
                return tokens.join('');
            })();
            mock.setGenerateResponse(generator);

            const stream = await client.generate('model1', context, query, true);
            assert(stream[Symbol.asyncIterator], 'Response should be an AsyncGenerator');

            const received = [];
            for await (const token of stream) {
                received.push(token);
            }

            const calls = mock.getGenerateCalls();
            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0], {
                model: 'model1',
                context,
                query,
                stream: true
            });
            assert.deepEqual(received, tokens);
        });
    });

    describe('factory creation', () => {
        it('creates client with provider configuration', () => {
            assert.throws(() => Client.create('invalid', {}), /Unsupported provider/);
            // Additional provider creation tests would go here once we have real providers
        });
    });
}
