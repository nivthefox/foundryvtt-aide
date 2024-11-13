/**
 * STORAGE_FORMAT_VERSION is a version number for the conversation data format
 * This is used to determine if the stored data needs to be migrated
 * @type {number}
 */
const STORAGE_FORMAT_VERSION = 1;

/**
 * Store manages the storage and retrieval of conversation data
 *
 * Each conversation is stored as a JSON file in the conversation directory.
 *
 * The store is responsible for loading and saving conversations to the server
 * file system. It also manages the list of conversations in memory.
 */
export class Store {
    /**
     * @type {object} context
     */
    #context;

    /**
     * conversations is a map of conversation ID to a Conversation
     *
     * When a conversation is first discovered, it is added to the map as {loaded: false}.
     *
     * When a conversation is required by the user, it is loaded from the server file system
     * and updated in the map as {loaded: true}.
     *
     * When a conversation is updated by another user, the loaded value is re-set to false.
     *
     * @type {Map<string, Conversation>}
     */
    #conversations = new Map();

    #emitter;

    /**
     * @param context
     * @param {Emitter} emitter
     */
    constructor(context, emitter) {
        this.#context = context;
        this.#emitter = emitter;

    }

    /**
     * initialize configures the store for use
     *
     * It ensures that the conversation directory exists on the server file system,
     * loads the list of conversations from the server file system, and sets up
     * event listeners for new and updated conversations.
     *
     * @returns {Promise<void>}
     * @throws {Error} if there is a problem loading the conversations
     * @throws {Error} if there is a problem creating the data directory
     * @throws {Error} if there is a problem creating the conversation directory
     */
    async initialize() {
        await this.#createDirectoryIfMissing();
        await this.#fetchConversations();

        this.#emitter.on('conversation.create', (id) =>
            this.#conversations.set(id, {id, loaded: false}));
        this.#emitter.on('conversation.delete', (id) =>
            this.#conversations.delete(id));
        this.#emitter.on('conversation.update', (id) => {
            const {userId} = this.#conversations.get(id);
            this.#conversations.set(id, {id, loaded: false});
            this.get(userId, id);
        });
    }

    /**
     * conversations returns the list of conversations
     * @returns {Conversation[]}
     */
    conversations() {
        return Array.from(this.#conversations.values())
            .map(({id, userId, title, messages}) =>
                ({
                    id, userId, title,
                    messages: messages ? messages.length : 0,
                    last: messages ? messages[messages.length - 1].time : 0
                }));
    }

    /**
     * create will create a new conversation in the store
     * @param {string} userId
     * @returns {Conversation} the new conversation
     * @throws {Error} if the conversation is not valid
     * @throws {Error} if there is a problem saving the conversation
     */
    async create(userId) {
        const id = this.#context.foundry.utils.randomID();

        const conversation = {
            id, userId,
            title: 'New Conversation',
            messages: [],
            context: [],
            format: STORAGE_FORMAT_VERSION,
        };

        return conversation;
    }

    /**
     * delete will remove a conversation from the store
     * @param {string} userId
     * @param {string} conversationId
     * @returns {Promise<void>}
     * @throws {Error} if there is a problem deleting the conversation
     */
    async delete(userId, conversationId) {
        const path = this.#getConversationPath(userId, conversationId);
        const fileName = path.split('/').pop();
        const file = new File(['{}'], fileName, {type: 'application/json'});
        const response = await this.#context.FilePicker.upload(this.#source, this.#storagePath, file);

        if (!response.path) {
            throw new Error('Failed to delete conversation');
        }

        this.#conversations.delete(conversationId);
        this.#emitter.emit('conversation.delete', conversationId);
    }

    /**
     * get returns a conversation from the store
     *
     * If the conversation is not in the store, it will be loaded from the
     * server file system.
     *
     * @param {string} userId
     * @param {string} conversationId
     * @returns {Conversation}
     * @throws {Error} if the conversation cannot be found
     * @throws {Error} if there is a problem loading the conversation
     * @throws {Error} if the conversation is not valid
     */
    async get(userId, conversationId) {
        if (!this.#conversations.has(conversationId) || !this.#conversations.get(conversationId).loaded) {
            const path = `/${this.#getConversationPath(userId, conversationId)}`;
            const response = await this.#context.fetch(path);
            if (!response.ok) {
                throw new Error('File not found');
            }
            const conversation = await response.json();
            if (!conversation || conversation.id !== conversationId) {
                // deleted
                this.#conversations.delete(conversationId);
                return;
            }
            if (conversation.format !== STORAGE_FORMAT_VERSION) {
                // todo: migrate conversation
                throw new Error('Invalid conversation format');
            }
            this.#conversations.set(conversationId, {...conversation, loaded: true});
        }

        const conversation = this.#conversations.get(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        return structuredClone(conversation);
    }

    /**
     * update will update a conversation in the store
     * @param conversation
     * @returns {Promise<void>}
     */
    async update(conversation) {
        const {userId, id} = conversation;
        await this.#uploadConversation(userId, conversation);

        this.#conversations.set(id, {...conversation, loaded: true});
        this.#emitter.emit('conversation.update', id);
    }

    /**
     * #createDirectoryIfMissing creates the conversation directory
     *
     * @private
     */
    async #createDirectoryIfMissing() {
        try {
            await this.#context.FilePicker.browse(this.#source, this.#storagePath);
        } catch (err) {
            if (!await this.#context.FilePicker.createDirectory(this.#source, this.#storagePath, {})) {
                throw new Error('Failed to create conversation directory');
            }
        }
    }

    /**
     * getConversationPath returns the path to a conversation file on the server file system
     * @private
     * @param userId
     * @param conversationId
     * @returns {string}
     */
    #getConversationPath(userId, conversationId) {
        return `${this.#storagePath}/${userId}.${conversationId}.json`;
    }

    async #fetchConversations() {
        const conversationFiles = await this.#context.FilePicker.browse(this.#source, this.#storagePath);
        for (const file of conversationFiles.files) {
            const fileName = file.split('/').pop();
            const parts = fileName.split('.');
            if (parts.length !== 3 || parts[2] !== 'json') {
                continue;
            }
            const userId = parts[0];
            const conversationId = parts[1];
            this.#conversations.set(conversationId, {id: conversationId, userId, loaded: false});
            await this.get(userId, conversationId);
        }
    }

    get #storagePath() {
        return `worlds/${this.#context.game.world.id}/conversations`;
    }

    get #source() {
        return 'data';
    }

    async #uploadConversation(userId, conversation) {
        const path = this.#getConversationPath(userId, conversation.id);
        const fileName = path.split('/').pop();
        const file = new File([JSON.stringify(conversation)], fileName, {type: 'application/json'});
        const response = await this.#context.FilePicker.upload(this.#source, this.#storagePath, file);

        if (!response.path) {
            throw new Error('Failed to save conversation');
        }
    }
}
