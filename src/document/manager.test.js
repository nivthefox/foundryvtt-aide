import { Suite } from '../../test/quench';
import { Manager } from './manager';
import { MockAIProvider } from '../ai/provider/provider.mock';
import { MockVectorStore } from './vector_store.mock';
import { MockFoundry } from '../foundry.mock';

import jsmock from '../../test/jsmock';
const { MockController } = jsmock;

Suite('document.manager', ManagerTest);
export default function ManagerTest(quench) {
    const {describe, it, assert, beforeEach} = quench;

    let ctrl;
    let mockAI;
    let mockStore;
    let mockFoundry;
    let manager;

    beforeEach(() => {
        ctrl = new MockController(quench);
        mockAI = new MockAIProvider(ctrl);
        mockStore = new MockVectorStore(ctrl);
        mockFoundry = new MockFoundry(ctrl);

        const managerOptions = {
            ChunkSize: 32,
            ChunkOverlap: 2,
            EmbeddingModel: 'test-model'
        };
        manager = new Manager(mockFoundry, managerOptions, mockAI, mockStore);
    });

    describe('document retrieval', () => {
        it('retrieves document by ID', async () => {
            const mockDoc = {
                type: 'text',
                name: 'Test Page',
                text: {
                    content: 'Test content',
                    format: 1,
                }
            };
            mockFoundry.EXPECT().fromUuid('test-id').Return(mockDoc);

            const doc = await manager.getDocument('test-id');
            assert.deepEqual(doc, mockDoc);
        });

        it('handles missing documents', async () => {
            mockFoundry.EXPECT().fromUuid('missing-id').Return(undefined);
            const doc = await manager.getDocument('missing-id');
            assert.equal(doc, undefined);
        });
    });

    describe('document chunking', () => {
        it('chunks document content with overlap', async () => {
            const content = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam feugiat condimentum ultricies. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec ornare lacus orci. Pellentesque purus enim, cursus eget condimentum sit amet, feugiat vitae sem. In condimentum odio nisi, eget luctus felis efficitur ut. Duis ultrices ligula eros, sed placerat leo pharetra id. Nulla eu erat quis ligula bibendum cursus. Duis nulla urna, dapibus quis condimentum nec, viverra sit amet dui. Praesent mollis odio ipsum, eget fringilla justo fringilla nec.`;

            const mockDoc = {
                type: 'text',
                text: {
                    content,
                    format: 1
                }
            };

            mockFoundry.EXPECT().fromUuid('test-id').Return(mockDoc);

            const chunks = await manager.chunks('test-id');
            assert(chunks.length > 0);
            assert.equal(chunks[0], "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam feugiat condimentum ultricies. Class ");
            assert.equal(chunks[1], "Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec ");
        });

        it('handles empty documents', async () => {
            const mockDoc = {
                type: 'text',
                text: { content: '' }
            };

            mockFoundry.EXPECT().fromUuid('empty-id').Return(mockDoc);
            const chunks = await manager.chunks('empty-id');
            assert.deepEqual(chunks, []);
        });
    });

    describe('context retrieval', () => {
        it('retrieves context for multiple documents', async () => {
            const docs = [
                {
                    uuid: 'doc1',
                    type: 'text',
                    name: 'Doc 1',
                    text: {
                        content: 'Content 1',
                        format: 1
                    }
                },
                {
                    uuid: 'doc2',
                    type: 'text',
                    name: 'Doc 2',
                    text: {
                        content: 'Content 2',
                        format: 1
                    }
                }
            ];

            mockFoundry.EXPECT().fromUuid('doc1').Return(docs[0]);
            mockFoundry.EXPECT().fromUuid('doc2').Return(docs[1]);

            const contexts = await manager.contexts(['doc1', 'doc2']);
            assert.equal(contexts.length, 2);
            assert.equal(contexts[0].uuid, 'doc1');
            assert.equal(contexts[1].uuid, 'doc2');
            assert.equal(contexts[0].content, '<JournalEntry title="Doc 1">Content 1</JournalEntry>');
            assert.equal(contexts[1].content, '<JournalEntry title="Doc 2">Content 2</JournalEntry>');
        });

        it('filters out non-indexable documents', async () => {
            const docs = [
                {
                    uuid: 'doc1',
                    type: 'text',
                    name: 'Doc 1',
                    text: {
                        content: 'Content 1',
                        format: 1
                    }
                },
                {
                    uuid: 'doc2',
                    type: 'image',
                }
            ];

            mockFoundry.EXPECT().fromUuid('doc1').Return(docs[0]);
            mockFoundry.EXPECT().fromUuid('doc2').Return(docs[1]);

            const contexts = await manager.contexts(['doc1', 'doc2']);
            assert.equal(contexts.length, 1);
            assert.equal(contexts[0].uuid, 'doc1');
            assert.equal(contexts[0].content, '<JournalEntry title="Doc 1">Content 1</JournalEntry>');
        });
    });

    describe('vector store management', () => {
        it('rebuilds vector store for all documents', async () => {
            const pages1 = new Collection();
            pages1.set('Page1', {
                uuid: 'Doc1.Page1',
                type: 'text',
                name: 'Doc 1',
                text: {
                    content: 'Content 1',
                    format: 1
                }
            });
            pages1.set('Page2', {
                uuid: 'Doc1.Page2',
                type: 'text',
                name: 'Doc 2',
                text: {
                    content: 'Content 2',
                    format: 1
                }
            });
            pages1.set('Page3', {
                uuid: 'Doc1.Page3',
                type: 'image',
            });

            const pages2 = new Collection();
            pages2.set('Page1', {
                uuid: 'Doc2.Page1',
                type: 'text',
                name: 'Doc 2',
                text: {
                    content: 'Content 3',
                    format: 1
                }
            });

            const docs = new Collection();
            docs.set('Doc1', {pages: pages1});
            docs.set('Doc2', {pages: pages2});

            mockFoundry.EXPECT().game.journal.Return(docs).AnyTimes();
            mockFoundry.EXPECT().fromUuid(jsmock.AnyString).DoAndReturn((id) => {
                const [doc, page] = id.split('.');
                return docs.get(doc)?.pages.get(page);
            }).Times(3);

            const embed1 = mockAI.EXPECT().embed('test-model', 'Doc1.Page1', ['Content 1']).Return({
                id: 'Doc1.Page1',
                vectors: [
                    [1, 2, 3],
                    [4, 5, 6]
                ]
            });
            const embed2 = mockAI.EXPECT().embed('test-model', 'Doc1.Page2', ['Content 2']).Return({
                id: 'Doc1.Page2',
                vectors: [[4, 5, 6]]
            });
            const embed3 = mockAI.EXPECT().embed('test-model', 'Doc2.Page1', ['Content 3']).Return({
                id: 'Doc2.Page1',
                vectors: [[7, 8, 9]]
            });
            mockStore.EXPECT().clear().After(embed1).After(embed2).After(embed3);
            mockStore.EXPECT().addBatch([
                { id: 'Doc1.Page1', vectors: [[1, 2, 3], [4, 5, 6]] },
                { id: 'Doc1.Page2', vectors: [[4, 5, 6]] },
                { id: 'Doc2.Page1', vectors: [[7, 8, 9]] }
            ]);

            await manager.rebuildVectorStore();
        });

        it('updates vectors for changed document', async () => {
            const oldDoc = {
                uuid: 'test-id',
                type: 'text',
                name: 'Test Doc',
                text: {
                    content: 'Old content',
                    format: 1,
                }
            };

            const newDoc = {
                uuid: 'test-id',
                type: 'text',
                name: 'Test Doc',
                text: {
                    content: 'New content',
                    format: 1,
                }
            };



            mockAI.EXPECT().embed('test-model', 'test-id', ['New content']).Return({
                id: 'test-id',
                vectors: [[1, 2, 3]]
            });

            mockStore.EXPECT().add({
                id: 'test-id',
                vectors: [[1, 2, 3]]
            });

            await manager.updateDocumentVectors(oldDoc, newDoc);
        });

        describe('document deletion', () => {
            it('removes vectors for deleted document', () => {
                const doc = {
                    uuid: 'test-id',
                    type: 'text',
                    name: 'Test Doc',
                    text: {
                        content: 'Test content',
                        format: 1
                    }
                };

                mockStore.EXPECT().delete('test-id');
                manager.deleteDocumentVectors(doc, {}, 'someId');
            });

            it('handles document without uuid', () => {
                const doc = {
                    type: 'text',
                    name: 'Test Doc',
                    text: {
                        content: 'Test content',
                        format: 1
                    }
                };

                // Should not trigger store removal when no uuid
                manager.deleteDocumentVectors(doc, {}, 'someId');
            });

            it('handles undefined document', () => {
                // Should not trigger store removal for undefined doc
                manager.deleteDocumentVectors(undefined, {}, 'someId');
            });
        });

        it('skips vector update for unchanged content', async () => {
            const doc = {
                uuid: 'test-id',
                type: 'text',
                name: 'Test Doc',
                text: {
                    content: 'Same content',
                    format: 1
                }
            };

            await manager.updateDocumentVectors(doc, doc);
        });
    });
}
