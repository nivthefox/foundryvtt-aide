
import { Suite } from '../../test/quench';
import { Client } from './client';
import { MockAIProvider } from './provider/provider.mock';

import jsmock from '../../test/jsmock';
const { MockController } = jsmock;

Suite('ai.client', ClientTest);
export default function ClientTest(quench) {
    let {beforeEach, describe, it, assert} = quench;

    let ctrl = new MockController(quench);
    let mock;
    let client;

    beforeEach(() => {
        mock = new MockAIProvider(ctrl);
        client = new Client(mock);
    });

    describe('model listing', () => {
        it('retrieves chat models', async () => {
            mock.EXPECT().getChatModels().Return(['model1', 'model2']);
            const result = await client.getChatModels();
            assert.deepEqual(result, ['model1', 'model2']);
        });

        it('retrieves embedding models', async () => {
            mock.EXPECT().getEmbeddingModels().Return(['embed1', 'embed2']);
            const result = await client.getEmbeddingModels();
            assert.deepEqual(result, ['embed1', 'embed2']);
        });
    });

    describe('document embedding', () => {
        it('embeds document chunks', async () => {
            mock.EXPECT().embed('model1', 'doc1', ['chunk1', 'chunk2']).Return({
                id: 'doc1',
                vectors: [[1, 2], [3, 4]]
            });

            const result = await client.embed('model1', 'doc1', ['chunk1', 'chunk2']);
            assert.deepEqual(result, {
                id: 'doc1',
                vectors: [[1, 2], [3, 4]]
            });
        });
    });

    describe('chat generation', () => {
        const context = [{
            id: 'doc1',
            title: 'Test Document',
            content: 'test context'
        }];

        it('generates non-streaming response', async () => {
            mock.EXPECT().generate('model1', context, 'test query', false).Return('Hello, world!');
            const result = await client.generate('model1', context, 'test query');
            assert.equal(result, 'Hello, world!');
        });

        it('generates streaming response', async () => {
            const tokens = ['Hello', 'Hello world', 'Hello world!'];
            const generator = (async function* () {
                for (const token of tokens) {
                    yield token;
                }
                return tokens[tokens.length - 1];
            })();
            mock.EXPECT().generate('model1', context, 'test query', true).Return(generator);
            const stream = await client.generate('model1', context, 'test query', true);
            assert(stream[Symbol.asyncIterator], 'Response should be an AsyncGenerator');
            let i = 0;
            for await (const token of stream) {
                assert.equal(token, tokens[i++]);
            }
            assert.equal(i, tokens.length, 'All tokens should be processed');
        });
    });

    describe('factory creation', () => {
        it('creates client with provider configuration', () => {
            assert.throws(() => Client.create({provider: 'invalid'}), /Unsupported provider/);
            // Additional provider creation tests would go here once we have real providers
        });
    });
}
