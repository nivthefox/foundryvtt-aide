/**
 * STORAGE_KEY is a unique identifier for the location in local storage
 * @type {string}
 */
const STORAGE_KEY = 'foundryvtt.aide.vectors';

/**
 * STORAGE_FORMAT_VERSION is a version number for the storage format
 * This is used to determine if the stored data needs to be migrated
 * @type {number}
 */
const STORAGE_FORMAT_VERSION = 1;

/**
 * VectorStore manages the storage and comparison of document vectors
 *
 * Each document is represented by an array of chunk vectors which are compared
 * to a query vector to find the most similar documents in the store.
 *
 * The store uses a weighted combination of maximum and average chunk similarity
 * to rank documents.
 */
export class VectorStore {
    /** @type {Map<string, Vector[]>} */
    #cache = new Map();

    /** @type {number} */
    #dimension = 0;

    /**
     * @param {number} [lookups=3]
     * @param {number} [maxWeight=0.7]
     * @param {number} [queryBoostFactor=1.2]
     */
    constructor(lookups = 3, maxWeight = 0.7, queryBoostFactor = 1.2) {
        this.lookups = lookups;
        this.maxWeight = maxWeight;
        this.queryBoostFactor = queryBoostFactor;
        this.#loadFromStorage();
    }

    /**
     * add will add a new document and its chunk vectors to the store
     * @param {EmbeddingDocument} document
     * @returns {void}
     */
    add(document) {
        document.vectors.forEach(vector => this.#validateVector(vector, document.id));
        this.#cache.set(document.id, document.vectors);
        queueMicrotask(() => this.#saveToStorage());
    }

    /**
     * addBatch will add multiple documents and their chunks to the store
     * @param {EmbeddingDocument[]} documents
     * @returns {void}
     */
    addBatch(documents) {
        documents.forEach(({id, vectors}) =>
            vectors.forEach(vector => this.#validateVector(vector, id))
        );
        documents.forEach(({id, vectors}) =>
            this.#cache.set(id, vectors)
        );
        queueMicrotask(() => this.#saveToStorage());
    }

    /**
     * delete will remove a document and its vectors from the store
     */
    delete(id) {
        this.#cache.delete(id);
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
     * findSimilar with enhanced query processing
     * @param {Vector | Vector[]} queryVectors
     * @returns {SimilarityResult[]}
     */
    findSimilar(queryVectors) {
        const queries = Array.isArray(queryVectors[0]) ? queryVectors : [queryVectors];
        const avgWeight = 1 - this.maxWeight;

        return Array.from(this.#cache.entries())
            .map(([id, documentVectors]) => {
                // For each query vector, calculate similarities with all document chunks
                const queryScores = queries.map(queryVector => {
                    const similarities = documentVectors.map(docVector => ({
                        similarity: this.#calculateSimilarity(queryVector, docVector)
                    }));

                    const maxSim = similarities.reduce((max, curr) =>
                        curr.similarity > max.similarity ? curr : max
                    );
                    const avgSim = similarities.reduce((sum, curr) =>
                        sum + curr.similarity, 0) / similarities.length;

                    return (maxSim.similarity * this.maxWeight) + (avgSim * avgWeight);
                });

                // Take the maximum score across all query vectors
                const score = queryScores.reduce((sum, score) => sum + score, 0) / queryScores.length;

                return { id, score };
            })
            .sort((a, b) => b.score - a.score)
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
     * @returns {VectorStoreStats}
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
            version: STORAGE_FORMAT_VERSION
        };
    }

    /**
     * Calculate cosine similarity with length normalization
     * @private
     * @param {Vector} vecA
     * @param {Vector} vecB
     * @returns {number}
     */
    #calculateSimilarity(vecA, vecB) {
        const dot = vecA.reduce((sum, a, i) => sum + (a * vecB[i]), 0);
        const normA = Math.sqrt(vecA.reduce((sum, a) => sum + (a * a), 0));
        const normB = Math.sqrt(vecB.reduce((sum, b) => sum + (b * b), 0));

        // Calculate basic cosine similarity
        const cosineSim = dot / (normA * normB);

        // Square it to emphasize directional alignment
        const directionEmphasis = cosineSim * cosineSim;

        // Apply length normalization boost for shorter vectors
        const lengthRatio = Math.min(normA, normB) / Math.max(normA, normB);
        const boost = normA < normB ? this.queryBoostFactor : 1;

        return directionEmphasis * Math.pow(lengthRatio, boost);
    }

    /**
     * @private
     * @throws {Error} If there is an error loading from local storage
     */
    #loadFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY) || '{}';
        const deserialized = JSON.parse(stored);

        if (deserialized.formatVersion !== undefined && deserialized.formatVersion !== STORAGE_FORMAT_VERSION) {
            this.#migrate(deserialized);
        }

        if (!deserialized.entries) {
            return;
        }

        for (const [key, value] of Object.entries(deserialized.entries)) {
            this.#cache.set(key, value);
        }
    }

    /**
     * @private
     * @param {Object} stored
     */
    #migrate(stored) {
        // todo: Migrate from one format version to another
    }

    /**
     * @private
     * @throws {Error} If there is an error saving to local storage
     */
    #saveToStorage() {
        const data = {
            formatVersion: STORAGE_FORMAT_VERSION,
            entries: Object.fromEntries(this.#cache.entries())
        };

        const serialized = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, serialized);
    }

    /**
     * @private
     * @param {Vector} vector
     * @param {string} id
     * @throws {Error} If the vector is invalid or dimensions don't match
     */
    #validateVector(vector, id) {
        if (!Array.isArray(vector) || !vector.every(n => typeof n === 'number')) {
            throw new Error(`Vector for ${id} must be an array of numbers`);
        }

        if (this.#dimension === 0) {
            this.#dimension = vector.length;
        } else if (vector.length !== this.#dimension) {
            throw new Error(
                `Vector dimension mismatch for ${id}. `
                + `Expected ${this.#dimension}, got ${vector.length}`
            );
        }
    }
}
