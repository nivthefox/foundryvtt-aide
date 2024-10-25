import { Suite } from '../app/Quench';
import { Client } from './client';
import { MockVendor } from '././vendor/mock_vendor';

Suite('ai.client', ClientTest);
export default function ClientTest({describe, it, assert, beforeEach}) {
    let mock;
    let client;

    beforeEach(() => {
        mock = new MockVendor();
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
            const documentID = 'doc1';
            const chunks = ['chunk1', 'chunk2'];
            const vectors = [[1, 2], [3, 4]];
            mock.setEmbedResponse({documentID, chunks: vectors});

            const result = await client.embed('model1', documentID, chunks);

            const calls = mock.getEmbedCalls();
            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0], {
                model: 'model1',
                documentID,
                chunks
            });
            assert.deepEqual(result, {documentID, chunks: vectors});
        });
    });

    describe('chat generation', () => {
        const context = [{documentID: 'doc1', text: 'context'}];
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
        it('creates client with vendor configuration', () => {
            assert.throws(() => Client.create('invalid', {}), /Unsupported vendor/);
            // Additional vendor creation tests would go here once we have real vendors
        });
    });
}
