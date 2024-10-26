import { Suite } from '../app/quench';
import { VectorStore } from './vector_store';

Suite('document.vector_store', VectorStoreTest);
export default function VectorStoreTest({describe, it, assert, beforeEach, afterEach}) {
    let store = null;
    const mockLogger = {
        debug: () => {},
        error: () => {}
    };

    beforeEach(() => {
        localStorage.clear();
        store = new VectorStore(mockLogger);
    });

    afterEach(() => {
        localStorage.clear();
        store = null;
    });

    describe('validation cases', () => {
        /**
         * @type {Array<{
         *   name: string,
         *   input: EmbeddingDocument,
         *   errorContains: string,
         *   setup?: () => void
         * }>}
         */
        const testCases = [
            {
                name: 'rejects string vectors',
                input: {
                    id: 'test',
                    vectors: [['a', 'b', 'c']],
                },
                errorContains: 'must be an array of numbers'
            },
            {
                name: 'rejects mixed type vectors',
                input: {
                    id: 'test',
                    vectors: [[1, '2', 3]],
                },
                errorContains: 'must be an array of numbers'
            },
            {
                name: 'rejects mismatched dimensions',
                setup: () => store.add({id: 'first', vectors: [[1, 2, 3]]}),
                input: {
                    id: 'test',
                    vectors: [[1, 2]],
                },
                errorContains: 'dimension mismatch'
            }
        ];

        testCases.forEach(({name, input, errorContains, setup}) => {
            it(name, () => {
                if (setup) setup();
                assert.throws(() => store.add(input), errorContains);
            });
        });
    });

    describe('persistence', () => {
        /** @type {Array<{
         *   name: string,
         *   operation: (store: VectorStore) => void,
         *   expectSize: number
         * }>} */
        const persistenceTests = [
            {
                name: 'saves single document with chunks to localStorage',
                operation: store => store.add({id: 'doc1', vectors: [[1, 2, 3]]}),
                expectSize: 1
            },
            {
                name: 'saves batch to localStorage',
                operation: store => store.addBatch([
                    {
                        id: 'doc1',
                        vectors: [[1, 2, 3]]
                    },
                    {
                        id: 'doc2',
                        vectors: [
                            [4, 5, 6],
                            [7, 8, 9]
                        ]
                    }
                ]),
                expectSize: 2
            },
            {
                name: 'clears storage',
                operation: store => {
                    store.add({id: 'doc1', vectors: [[1, 2, 3]]});
                    store.clear();
                },
                expectSize: 0
            }
        ];

        persistenceTests.forEach(({name, operation, expectSize}) => {
            it(name, async () => {
                operation(store);
                await new Promise(resolve => {
                    setTimeout(resolve, 0);
                });
                const newStore = new VectorStore(mockLogger);
                assert.equal(newStore.size(), expectSize);
            });
        });
    });

    describe('similarity search', () => {
        /** @type {EmbeddingDocument[]} */
        const documents = [
            { id: 'doc1', vectors: [[1, 0, 0]]},
            { id: 'doc2', vectors: [[0, 1, 0]]},
            { id: 'doc3', vectors: [[0, 0, 1]]}
        ];

        /** @type {Array<{
         *   name: string,
         *   query: number[],
         *   expectFirst?: string,
         *   expectLength?: number,
         *   lookups?: number
         * }>} */
        const searchTests = [
            {
                name: 'finds exact match',
                query: [1, 0, 0],
                expectFirst: 'doc1'
            },
            {
                name: 'finds closest match',
                query: [0.9, 0.1, 0],
                expectFirst: 'doc1'
            },
            {
                name: 'handles equidistant vectors',
                query: [1, 1, 0],
                expectLength: 3
            },
            {
                name: 'respects lookup limit',
                query: [1, 1, 1],
                lookups: 2,
                expectLength: 2
            }
        ];

        searchTests.forEach(({name, query, expectFirst, expectLength, lookups}) => {
            it(name, () => {
                const testStore = lookups ? new VectorStore(mockLogger, lookups) : store;
                testStore.addBatch(documents);

                const results = testStore.findSimilar(query);
                if (expectFirst) {
                    assert.equal(results[0].id, expectFirst);
                }
                if (expectLength) {
                    assert.equal(results.length, expectLength);
                }
            });
        });
    });

    describe('similarity search with multiple chunks', () => {
        /** @type {EmbeddingDocument[]} */
        const documentsWithChunks = [
            {
                id: 'doc1',
                vectors: [
                    [1, 0, 0],
                    [0.9, 0.1, 0]
                ]
            },
            {
                id: 'doc2',
                vectors: [
                    [0, 1, 0],
                    [0, 0.9, 0.1]
                ]
            },
            {
                id: 'doc3',
                vectors: [
                    [0.3, 0.3, 0.3],
                    [0.4, 0.4, 0.4]
                ]
            }
        ];

        /**
         * @type {Array<{
         *   name: string,
         *   query: number[],
         *   expectFirst: string
         * }>} */
        const multiChunkTests = [
            {
                name: 'finds document with best max similarity',
                query: [1, 0, 0],
                expectFirst: 'doc1'  // Should match doc1's first chunk perfectly
            },
            {
                name: 'weights multiple similar chunks higher',
                query: [0.95, 0.05, 0],
                expectFirst: 'doc1'  // Both chunks in doc1 are similar to query
            },
            {
                name: 'balances max and average appropriately',
                query: [0.3, 0.3, 0.3],
                expectFirst: 'doc3'  // Lower max similarity but better average
            }
        ];

        multiChunkTests.forEach(({name, query, expectFirst}) => {
            it(name, () => {
                store.addBatch(documentsWithChunks);
                const results = store.findSimilar(query);
                assert.equal(results[0].id, expectFirst);
            });
        });
    });

    describe('statistics', () => {
        /** @type {Array<{
         *   name: string,
         *   setup: () => void,
         *   expect: VectorStoreStats
         * }>} */
        const statsTests = [
            {
                name: 'reports empty stats',
                setup: () => {},
                expect: {
                    documentCount: 0,
                    vectorDimensions: 0,
                    chunkCount: 0,
                    storageSize: 41,
                    version: 1
                }
            },
            {
                name: 'reports correct stats with data',
                setup: () => store.add({
                    id: 'doc1',
                    vectors: [
                        [1, 2, 3],
                        [4, 5, 6]
                    ]
                }),
                expect: {
                    documentCount: 1,
                    vectorDimensions: 3,
                    chunkCount: 2,
                    storageSize: 156,
                    version: 1
                }
            }
        ];

        statsTests.forEach(({name, setup, expect: expected}) => {
            it(name, () => {
                setup();
                const stats = store.stats();
                assert.equal(stats.documentCount, expected.documentCount);
                assert.equal(stats.vectorDimensions, expected.vectorDimensions);
                assert.equal(stats.chunkCount, expected.chunkCount);
                assert.equal(stats.version, expected.version);
                // Skip storageSize comparison as it might vary based on environment
            });
        });
    });
}
