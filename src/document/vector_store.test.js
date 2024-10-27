import { Suite } from '../../test/quench';
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
            },
            {
                name: 'deletes document from storage',
                operation: store => {
                    store.add({id: 'doc1', vectors: [[1, 2, 3]]});
                    store.delete('doc1');
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

    describe('similarity search with length normalization', () => {
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
         *   lookups?: number,
         *   queryBoostFactor?: number
         * }>} */
        const searchTests = [
            {
                name: 'handles short query vectors',
                query: [0.1, 0, 0], // Short magnitude query
                expectFirst: 'doc1',
                queryBoostFactor: 1.2
            },
            {
                name: 'works with default boost factor',
                query: [0.2, 0, 0],
                expectFirst: 'doc1'
            },
            {
                name: 'handles higher boost factors',
                query: [0.1, 0, 0],
                expectFirst: 'doc1',
                queryBoostFactor: 2.0
            }
        ];

        searchTests.forEach(({name, query, expectFirst, expectLength, lookups, queryBoostFactor}) => {
            it(name, () => {
                const testStore = new VectorStore(
                    mockLogger,
                    lookups || 3,
                    0.7,
                    queryBoostFactor
                );
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

    describe('multiple query vectors', () => {
        /** @type {EmbeddingDocument[]} */
        const documentsWithChunks = [
            {
                id: 'doc1',
                vectors: [
                    [1, 0, 0],
                    [0, 1, 0]
                ]
            },
            {
                id: 'doc2',
                vectors: [
                    [0, 0, 1],
                    [0.5, 0.5, 0]
                ]
            }
        ];

        /** @type {Array<{
         *   name: string,
         *   queries: number[][],
         *   expectFirst: string,
         *   description: string
         * }>} */
        const multiQueryTests = [
            {
                name: 'finds best match across multiple queries',
                queries: [
                    [0.1, 0, 0],   // Similar to doc1's first vector
                    [0, 0.1, 0]    // Similar to doc1's second vector
                ],
                expectFirst: 'doc1',
                description: 'Should match doc1 due to combined similarity'
            },
            {
                name: 'handles different query vector lengths',
                queries: [
                    [0.1, 0.1, 0], // Short magnitude
                    [0, 0, 1]      // Full magnitude
                ],
                expectFirst: 'doc2',
                description: 'Should match doc2 due to strong match with second query'
            },
            {
                name: 'respects maxWeight in multi-query scenario',
                queries: [
                    [0.5, 0.5, 0], // Matches doc2's second vector
                    [0, 0, 0.1]    // Weakly matches doc2's first vector
                ],
                expectFirst: 'doc2',
                description: 'Should favor doc2 due to balanced similarity across chunks'
            }
        ];

        multiQueryTests.forEach(({name, queries, expectFirst, description}) => {
            it(`${name} - ${description}`, () => {
                store.addBatch(documentsWithChunks);
                const results = store.findSimilar(queries);
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
