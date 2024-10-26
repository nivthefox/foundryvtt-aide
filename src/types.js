/**
 * @typedef {Object} AIProvider
 * @property {() => Promise<string[]>} getChatModels
 * @property {() => Promise<string[]>} getEmbeddingModels
 * @property {(model: string, context: ContextDocument[], query: string, stream?: boolean) =>
 *            Promise<string | AsyncGenerator<string, string>>} generate
 * @property {(model: string, id: string, chunks: Chunk[]) =>
 *            Promise<EmbeddingDocument>} embed
 */

/**
 * @typedef {Object} AIProviderConfig
 * @property {string} apiKey
 * @property {string} [baseURL]
 */

/**
 * @typedef {Object} ContextDocument
 * @property {string} id
 * @property {string} content
 * @property {string} title
 */

/**
 * @typedef {string} Chunk
 */

/**
 * @typedef {Object} EmbeddingDocument
 * @property {string} id
 * @property {Vector[]} vectors
 */

/**
 * @typedef {Object} SimilarityResult
 * @property {string} id
 * @property {number} score
 */

/**
 * @typedef {number[]} Vector
 */

/**
 * @typedef {Object} VectorStoreStats
 * @property {number} documentCount
 * @property {number} vectorDimensions
 * @property {number} chunkCount
 * @property {number} storageSize
 * @property {number} version
 */
