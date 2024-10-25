/**
 *  STORAGE_KEY is a unique identifier for the location in local storage
 *  @type {string}
 */
const STORAGE_KEY = 'foundryvtt.aide.vectors';

/**
 * STORAGE_FORMAT_VERSION is a version number for the storage format
 * This is used to determine if the stored data needs to be migrated
 * @type {number}
 */
const STORAGE_FORMAT_VERSION = 1;

/**
 * VectorStore provides semantic search across documents using vector embeddings
 *
 * @description
 * Manages document vectors for similarity-based search and retrieval. Documents
 * are split into chunks, with each chunk represented by a vector embedding.
 * When searching, documents are ranked using a configurable weighted
 * combination:
 * - Maximum chunk similarity (default 70% weight)
 * - Average chunk similarity (default 30% weight)
 *
 * The store maintains a two-layer architecture:
 * - In-memory cache for fast vector computations
 * - LocalStorage backing for persistence
 *
 * Data is immediately available in memory and asynchronously persisted to
 * storage for durability (eventual consistency model).
 *
 * @example
 * ```javascript
 * const store = new VectorStore(logger);
 * store.add('doc1', [[0.1, 0.2], [0.3, 0.4]]); // Add document chunks
 * const similar = store.findSimilar([0.1, 0.2]); // Find similar docs
 * ```
 */
export class VectorStore {
    #cache = new Map();
    #dimension = 0;

    constructor(logger, lookups = 3, maxWeight = 0.7) {
        this.logger = logger;
        this.lookups = lookups;
        this.maxWeight = maxWeight;
        this.#loadFromStorage();
    }

    /**
     * add will add a new document and its chunk vectors to the store
     * @param {string} documentID
     * @param {Array<{vector: Array<number>, text: string}>} chunks
     * @returns {void}
     */
    add(documentID, chunks) {
        chunks.forEach(chunk => this.#validateVector(chunk, documentID));
        this.#cache.set(documentID, chunks);
        queueMicrotask(() => this.#saveToStorage());
    }

    /**
     * addBatch will add multiple documents and their chunks to the store
     * @param {{documentID: string, chunks: Array<Array<Number>>}} entries
     * @returns {void}
     */
    addBatch(entries) {
        entries.forEach(({documentID, chunks}) =>
            chunks.forEach(chunk => this.#validateVector(chunk, documentID))
        );
        entries.forEach(({documentID, chunks}) =>
            this.#cache.set(documentID, chunks)
        );
        queueMicrotask(() => this.#saveToStorage());
    }

    /**
     * clear will remove all document vectors from the store
     */
    clear() {
        this.#cache.clear();
        queueMicrotask(() => this.#saveToStorage());
    }

    /**
     * findSimilar will find the most similar documents to a given query vector
     * using a weighted combination of maximum and average chunk similarity
     * @param {Array<number>} queryVector
     * @returns {{documentID: string, similarity: number}[]}
     */
    findSimilar(queryVector) {
        const avgWeight = 1 - this.maxWeight;

        return Array.from(this.#cache.entries())
            .map(([documentID, document]) => {
                const similarities = document.map(chunk => ({
                    similarity: cosineSimilarity(queryVector, chunk),
                }));

                const maxSim = similarities.reduce((max, curr) =>
                    curr.similarity > max.similarity ? curr : max
                );
                const avgSim = similarities.reduce((sum, curr) =>
                    sum + curr.similarity, 0) / similarities.length;

                return {
                    documentID,
                    similarity: (maxSim.similarity * this.maxWeight) + (avgSim * avgWeight),
                };
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, this.lookups);
    }

    /**
     * size returns the number of documents in the store
     * @returns {number}
     */
    size() {
        return this.#cache.size;
    }

    /**
     * stats returns statistics about the store
     * @returns {{documentCount: number, vectorDimensions: number,
     *            chunkCount: number, storageSize: number, version: number}}
     */
    stats() {
        const totalChunks = Array.from(this.#cache.values())
            .reduce((sum, document) => sum + document.length, 0);

        return {
            documentCount: this.#cache.size,
            vectorDimensions: this.#dimension,
            chunkCount: totalChunks,
            storageSize: JSON.stringify({
                formatVersion: STORAGE_FORMAT_VERSION,
                entries: Object.fromEntries(this.#cache.entries())
            }).length,
            version: STORAGE_FORMAT_VERSION,
        };
    }

    #loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) || '{}';
            const deserialized = JSON.parse(stored);
            if (deserialized.formatVersion !== undefined && deserialized.formatVersion !== STORAGE_FORMAT_VERSION) {
                this.logger.debug('found vector version mismatch');
                this.#migrate(deserialized);
            }

            for (const [key, value] of Object.entries(deserialized.entries)) {
                this.#cache.set(key, value);
            }
        } catch (error) {
            this.logger.error('error loading vectors from storage', error);
        }
    }

    #migrate(stored) {
        // todo: Migrate from one format version to another
    }

    #saveToStorage() {
        try {
            const data = {
                formatVersion: STORAGE_FORMAT_VERSION,
                entries: Object.fromEntries(this.#cache.entries())
            };

            const serialized = JSON.stringify(data);
            localStorage.setItem(STORAGE_KEY, serialized);
        } catch (error) {
            this.logger.error('error saving vectors to storage', error);
        }
    }

    #validateVector(vector, documentID) {
        if (!Array.isArray(vector) || !vector.every(n => typeof n === 'number')) {
            throw new Error(`Vector for ${documentID} must be an array of numbers`);
        }

        if (this.#dimension === 0) {
            this.#dimension = vector.length;
        } else if (vector.length !== this.#dimension) {
            throw new Error(
                `Vector dimension mismatch for ${documentID}. `
                + `Expected ${this.#dimension}, got ${vector.length}`
            );
        }
    }
}

function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, a, i) => sum + (a * vecB[i]), 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + (a * a), 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + (b * b), 0));
    return dot / (normA * normB);
}
