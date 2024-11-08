/**
 * DocumentManager encapsulates document-related operations
 *
 * @description
 * This includes retrieval, chunking, and vector store management. It handles
 * the lifecycle of document vectors and determines which documents can be
 * processed.
 *
 * @example
 * ```javascript
 * const manager = new Manager(config, client, store);
 *
 * // Get document chunks for processing
 * const chunks = await manager.chunks(documentId);
 *
 * // Get context for multiple documents
 * const context = await manager.contexts(['doc1', 'doc2']);
 *
 * // Rebuild vector store if needed
 * await manager.rebuildVectorStore();
 * ```
 */
export class DocumentManager {
    /**
     * @type {ManagerConfiguration}
     */
    #options = {
        ChunkSize: 512,
        ChunkOverlap: 32,
        EmbeddingModel: '',
    };

    /**
     * @type {VectorStore}
     */
    #store;

    /**
     * @type {AIProvider}
     */
    #client;

    /**
     * @type {object}
     */
    #context;

    /**
     * @param {object} context - typically `window`, but may be a test context
     * @param {ManagerConfiguration} options
     * @param {AIProvider} client
     * @param {VectorStore} store
     */
    constructor(context, options, client, store) {
        this.#context = context;
        this.#options = { ...this.#options, ...options };
        this.#client = client;
        this.#store = store;
    }

    /**
     * chunks returns the content of a document split into chunks
     *
     * It overlaps chunks by the amount specified in the options
     *
     * @param {string} id
     * @returns {Promise<Chunk[]>}
     */
    async chunks(id) {
        const doc = await this.getDocument(id);
        if (!this.#indexable(doc)) {
            return [];
        }
        return this.calculateChunks(doc.text.content);
    }

    /**
     * contexts returns the context documents for a list of document IDs
     *
     * @param {string[]} ids
     * @returns {Promise<ContextDocument[]>}
     */
    async contexts(ids) {
        const docs = await Promise.all(ids.map(id => this.getDocument(id)));
        return docs.flat()
            .filter(this.#indexable)
            .filter(doc => doc.text.content.length > 0)
            .map(doc => ({
                uuid: doc.uuid,
                content: `<JournalEntry title="${doc.name}">${doc.text.content}</JournalEntry>`,
            }));
    }

    /**
     * getDocument retrieves a document by ID from Foundry VTT
     * @param {string} id
     * @returns {Promise<JournalEntryPage | undefined>}
     */
    async getDocument(id) {
        return await this.#context.fromUuid(id);
    }

    #indexable(document) {
        return (
            document.type === 'text'
            && document.text !== null && document.text !== undefined
            && document.text.content !== undefined && document.text.content !== null
            && document.text.content.length > 0
        );
    }

    /**
     * rebuildVectorStore clears and rebuilds the store for all documents
     */
    async rebuildVectorStore() {
        const documents = this.#context.game.journal.map(j => j.pages.contents).flat().filter(this.#indexable);
        let allDocumentVectors = [];
        for (const doc of documents) {
            const chunks = await this.chunks(doc.uuid);
            if (chunks.length === 0) {
                continue;
            }
            const vectors = await this.#client.embed(this.#options.EmbeddingModel, doc.uuid, chunks);
            allDocumentVectors.push(vectors);
        }

        await this.#store.clear();
        await this.#store.addBatch(allDocumentVectors);
    }

    /**
     * deleteDocumentVectors removes vectors for a given document
     *
     * This method is called by the preDeleteJournalEntryPage hook.
     * @param {JournalEntryPage} document
     * @param {object} options
     * @param {string} id
     * @returns {Promise<void>}
     */
    async deleteDocumentVectors(document, { id }) {
        if (document === undefined || !this.#indexable(document)) {
            return;
        }

        if (typeof document.uuid !== 'string') {
            return;
        }

        await this.#store.delete(document.uuid);
    }

    /**
     * updateDocumentVectors updates vector store for a given document
     *
     * This method is called by the preUpdateJournalEntryPage hook.
     *
     * @param {JournalEntryPage} document
     * @param {JournalEntryPage} changed
     * @returns {Promise<void>}
     */
    async updateDocumentVectors(document, changed) {
        if (!this.#indexable(document)) {
            return;
        }

        if (deepEquals(document, changed)) {
            return;
        }

        const chunks = this.calculateChunks(changed.text.content);
        if (chunks.length === 0) {
            return;
        }

        const vectors = await this.#client.embed(this.#options.EmbeddingModel, changed.uuid, chunks);
        await this.#store.add(vectors);
    }

    calculateChunks(content) {
        const tokens = this.#tokenize(content);
        const chunks = [];

        for (let i = 0; i < tokens.length; i += this.#options.ChunkSize - this.#options.ChunkOverlap) {
            let start = i;
            while (start > 0 && !/\s|[.,!?]/.test(tokens[start - 1])) {
                start--;
            }

            let end = i + this.#options.ChunkSize;
            while (end < tokens.length && end > i && !/\s|[.,!?]/.test(tokens[end - 1])) {
                end--;
            }
            chunks.push(tokens.slice(start, end).join(''));
        }

        return chunks;
    }

    /**
     * tokenize breaks text into tokens
     * For now, this naively splits at every 4 characters or on a word boundary.
     *
     * todo: implement a more sophisticated tokenizer
     *
     * @param {string} text
     * @returns {string[]}
     */
    #tokenize(text) {
        const tokens = [];
        let token = '';

        for (let i = 0; i < text.length; i++) {
            token += text[i];
            if (token.length >= 4 || /\s|[.,!?]/.test(text[i])) {
                tokens.push(token);
                token = '';
            }
        }

        if (token.length > 0) {
            tokens.push(token);
        }

        return tokens;
    }
}

function deepEquals(a, b) {
    if (a === b) return true;

    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (let key of keysA) {
        if (!keysB.includes(key) || !deepEquals(a[key], b[key])) {
            return false;
        }
    }

    return true;
}
