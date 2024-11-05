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
 * @property {string} uuid
 * @property {string} [content]
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} userId
 * @property {string} [title]
 * @property {ConversationMessage[]} [messages]
 * @property {ContextDocument[]} [context]
 */

/**
 * @typedef {Object} ConversationContextDocument
 * @property {string} id
 * @property {string} name
 * @property {boolean} addedByUser
 * @property {boolean} removedByUser
 */

/**
 * @typedef {Object} ConversationMessage
 * @property {ConversationMessageUser} user
 * @property {boolean} isUserMessage
 * @property {string} content
 * @property {ConversationMessageTime} time
 */

/**
 * @typedef {Object} ConversationMessageUser
 * @property {string} name
 * @property {string} type
 */

/**
 * @typedef {Object} ConversationMessageTime
 * @property {string} display
 * @property {number} timestamp
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
 * @typedef {Object} JournalEntryPage
 * @property {{
 *     content: string,
 *     format: number,
 *     markdown: string | undefined,
 * }} text
 * @property {string} name
 * @property {string} type
 * @property {string} uuid
 */

/**
 * @typedef {Object} ManagerConfiguration
 * @property {number} ChunkSize
 * @property {number} ChunkOverlap
 * @property {string} EmbeddingModel
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
