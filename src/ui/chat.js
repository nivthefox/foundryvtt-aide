import {ChatSettings} from './settings.js';
import { DateTime } from 'luxon';

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class Chat extends HandlebarsApplicationMixin(ApplicationV2) {
    // Class Properties
    #activeConversation;
    #currentGeneration = null;
    #waitingForResponse = false;

    static DEFAULT_OPTIONS = {
        id: 'aide',
        position: {
            width: 960,
            height: 800,
        },
        window: {
            title: 'AIde',
            icon: 'fas fa-robot',
            minimizable: true,
            resizable: true,
        },
        actions: {
            deleteConversation: Chat.deleteConversation,
            deleteMessage: Chat.deleteMessage,
            load: Chat.loadConversation,
            new: Chat.newConversation,
            rename: Chat.rename,
            send: Chat.sendMessage,
            settings: Chat.openChatSettings,
            stop: Chat.stop,
        }
    };

    static PARTS = {
        sidebar: {
            classes: ['sidebar'],
            template: 'modules/aide/templates/applications/ChatSidebar.hbs'
        },
        chat: {
            classes: ['chat'],
            template: 'modules/aide/templates/applications/Chat.hbs'
        },
    };

    // Public Methods
    constructor(conversationStore, chatClient, embeddingClient, vectorStore, documentManager, options = {}) {
        super(options);
        this.chatClient = chatClient;
        this.conversationStore = conversationStore;
        this.documentManager = documentManager;
        this.embeddingClient = embeddingClient;
        this.vectorStore = vectorStore;
        this.#initializeMarkdownConverter();
    }

    async _onDestroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        await super._onDestroy();
    }

    async _onRender(data, options) {
        await super._onRender(data, options);
        this.#setupEditor(this.element);
        this.#scrollToBottom(this.element);
    }

    async _preparePartContext(partId, context) {
        switch (partId) {
            case 'sidebar':
                return this.#prepareSidebar();
            case 'chat':
                return this.#prepareChat();
        }
    }

    // Private Methods
    #addUserMessage(conversation, content) {
        conversation.messages.push({
            role: 'user',
            content,
            time: DateTime.now().toUTC().toMillis(),
        });
    }

    #bindEditorEvents(editorContent, placeholderText, sendButton, proseMirror) {
        this.#setupFocusEvents(editorContent, placeholderText);
        this.#setupContentObserver(editorContent, placeholderText, sendButton);
        this.#setupKeyboardShortcuts(proseMirror, sendButton);
        this.#setupRenameEvent(this.element);
    }

    async #determineContext(content) {
        let embeddableContent = this.#activeConversation.messages
            .reduce((acc, message) => `${acc}${message.content}\n\n`, '');
        embeddableContent += content;

        const model = game.settings.get('aide', 'EmbeddingModel');
        const chunks = this.documentManager.calculateChunks(embeddableContent);
        const embeddings = await this.embeddingClient.embed(model, this.#activeConversation.id, chunks);

        const results = this.vectorStore.findSimilar(embeddings.vectors);

        const context = [];
        for (const result of results) {
            const document = await fromUuid(result.id);
            if (document) {
                context.push(document);
            }
        }
        return context;
    }

    #formatMessageContent(content) {
        if (!content || content === '<p><br class="ProseMirror-trailingBreak"></p>') {
            return null;
        }
        const cleaned = content
            .replace(/<br class="ProseMirror-trailingBreak">/g, '')
            .replace(/<br><\/p>/g, '</p>');

        return this.converter.makeMarkdown(cleaned);
    }


    async #generateAIResponse(conversation, model, context) {
        this.#currentGeneration = await this.chatClient
            .generate(model, context, conversation.title, conversation.messages, true);

        conversation.messages.push({
            user: 'AIde',
            role: 'assistant',
            content: '',
            time: DateTime.now().toUTC().toMillis(),
        });
        await this.render(false);
    }

    async #generateConversationTitle(conversation, model) {
        try {
            const response = await this.chatClient.generate(model, [],
                conversation.title, [
                    ...conversation.messages,
                    {
                        role: 'user',
                        content: 'Provide a name for this conversation of 50 characters or less. Put the name in an HTML <title> element.',
                        time: DateTime.now().toUTC().toMillis()
                    }
                ], false);

            const match = response.match(/<title>(.*?)<\/title>/);
            conversation.title = match ? match[1] : 'New Conversation';
        } catch (error) {
            ui.notifications.error('An error occurred while naming the conversation.');
            console.error(error);
        }
    }

    #getEditorContent() {
        const proseMirror = this.element.querySelector('prose-mirror');
        const editorContent = this.element.querySelector('.editor-content');
        if (!proseMirror || !editorContent || !editorContent.innerText.trim().length) return null;

        const content = this.#formatMessageContent(editorContent.innerHTML);
        if (content) {
            editorContent.innerHTML = ''; // Clear input if we have valid content
        }
        return content;
    }

    #getEditorElements(html) {
        return {
            editorContent: html.querySelector('.editor-content'),
            placeholderText: html.querySelector('.placeholder-text'),
            sendButton: html.querySelector('.send'),
            proseMirror: html.querySelector('prose-mirror')
        };
    }

    #handleGenerationError(conversation, error) {
        const idx = conversation.messages.length - 1;
        const contentElement = this.element.querySelector('.message:last-of-type .content');

        if (error.name === 'AbortError') {
            conversation.messages[idx].content += '\n\n_Generation stopped._';
            conversation.messages[idx].time = DateTime.now().toUTC().toMillis();
            contentElement.innerHTML = this.converter.makeHtml(conversation.messages[idx].content);
        } else {
            ui.notifications.error('An error occurred while generating the response.');
            console.error(error);
        }
    }


    #initializeMarkdownConverter() {
        Object.entries(CONST.SHOWDOWN_OPTIONS).forEach(([k, v]) => showdown.setOption(k, v));
        this.converter = new showdown.Converter(CONST.SHOWDOWN_OPTIONS);
    }

    async #prepareChat() {
        if (!this.#activeConversation) {
            return {};
        }

        const conversation = structuredClone(this.#activeConversation);
        this.#processConversationMessages(conversation);
        return {...conversation, waitingForResponse: this.#waitingForResponse};
    }

    #processConversationMessages(conversation) {
        conversation.messages.forEach(message => {
            message.time = DateTime.fromMillis(message.time).toRelative();
            message.user = (message.role === 'user')
                ? game.users.get(conversation.userId).name
                : 'AIde';
            message.isUserMessage = message.role === 'user';
            message.content = this.converter.makeHtml(message.content);
        });
    }

    async #prepareSidebar() {
        const conversations = this.conversationStore.conversations();
        const sidebarConversations = {};

        conversations
            .sort((a, b) => b.last - a.last)
            .forEach(conversation => {
                const user = game.users.get(conversation.userId).name;
                if (!sidebarConversations[user]) {
                    sidebarConversations[user] = [];
                }
                sidebarConversations[user].push(conversation);
            });

        return Object.entries(sidebarConversations)
            .sort(([userA], [userB]) => userA.localeCompare(userB))
            .reduce((acc, [username, convos]) => {
                acc[username] = convos;
                return acc;
            }, {});
    }

    #scrollToBottom(html) {
        const conversation = html.querySelector('.conversation');
        conversation.scrollTop = conversation.scrollHeight;
    }

    #setupContentObserver(editorContent, placeholderText, sendButton) {
        this.observer = new MutationObserver(() => {
            const isEmpty = editorContent.innerHTML === '<p><br class="ProseMirror-trailingBreak"></p>';
            placeholderText.classList.toggle('hidden', !isEmpty);
            sendButton.classList.toggle('visible', !isEmpty);
        });

        this.observer.observe(editorContent, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    #setupEditor(html) {
        const elements = this.#getEditorElements(html);
        if (!this.#validateEditorElements(elements)) return;
        this.#bindEditorEvents(...Object.values(elements));
    }

    #setupFocusEvents(editorContent, placeholderText) {
        editorContent.addEventListener('focus', () => {
            placeholderText.classList.add('hidden');
        });

        editorContent.addEventListener('blur', () => {
            const isEmpty = editorContent.innerHTML === '<p><br class="ProseMirror-trailingBreak"></p>';
            if (isEmpty) placeholderText.classList.remove('hidden');
        });
    }

    #setupRenameEvent(html) {
        const input = html.querySelector('.chat h2 input');
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                Chat.rename.call(this, event, input);
            }
        });
        input.addEventListener('blur', event => {
            Chat.rename.call(this, event, input);
        });
    }

    #setupKeyboardShortcuts(proseMirror, sendButton) {
        proseMirror.addEventListener('keydown', event => {
            const isSubmitKey = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
            if (!isSubmitKey) return;

            event.preventDefault();
            if (!sendButton.classList.contains('visible')) return;
            sendButton.click();
        });
    }

    async #streamAIResponse(conversation) {
        const conversationElement = this.element.querySelector('.conversation');
        const contentElement = conversationElement.querySelector('.message:last-of-type .content');
        const idx = conversation.messages.length - 1;

        for await (const message of this.#currentGeneration) {
            conversation.messages[idx].content += message;
            conversation.messages[idx].time = DateTime.now().toUTC().toMillis();
            contentElement.innerHTML = this.converter.makeHtml(conversation.messages[idx].content);
            conversationElement.scrollTop = conversationElement.scrollHeight;
        }
    }

    #validateEditorElements({editorContent, placeholderText, sendButton, proseMirror}) {
        return editorContent && placeholderText && sendButton && proseMirror;
    }

    // Static Methods
    static async deleteConversation(event, target) {
        const confirmation = await Dialog.confirm({
            title: 'Delete Conversation',
            content: 'Are you sure you want to delete this conversation?',
        });

        if (!confirmation) {
            return;
        }

        const userId = target.parentElement.getAttribute('data-user-id');
        const id = target.parentElement.getAttribute('data-id');
        await this.conversationStore.delete(userId, id);
        await this.render(false);
    }

    static async deleteMessage(event, target) {
        const messageId = parseInt(target.getAttribute('data-message-id'), 10);
        const messages = this.#activeConversation.messages.slice(0, messageId);
        const diff = this.#activeConversation.messages.length - messages.length;

        const confirmation = await Dialog.confirm({
            title: 'Delete Message',
            content: `Are you sure you want to delete ${diff} messages?`,
        });

        if (!confirmation) {
            return;
        }

        this.#activeConversation.messages = messages;
        await this.conversationStore.update(this.#activeConversation);
        await this.render(false);
    }

    static async loadConversation(event, target) {
        const userId = target.parentElement.getAttribute('data-user-id');
        const id = target.parentElement.getAttribute('data-id');
        this.#activeConversation = await this.conversationStore.get(userId, id);
        await this.render(false);
    }

    static async newConversation(event, target) {
        this.#activeConversation = await this.conversationStore.create(game.user.id);
        await this.render(false);
    }

    static async rename(event, target) {
        if (target.value === '' || target.value === this.#activeConversation.title) {
            await this.render(false);
            return;
        }
        this.#activeConversation.title = target.value;
        await this.conversationStore.update(this.#activeConversation);
        await this.render(false);
    }

    static async stop(event, target) {
        if (this.#currentGeneration) {
            this.#currentGeneration.abort();
            this.#currentGeneration = null;
            this.#waitingForResponse = false;
            await this.render(false);
        }
    }

    static openChatSettings(event, target) {
        new ChatSettings().render(true);
    }

    static async sendMessage(event, target) {
        const content = this.#getEditorContent();
        if (!content) return;

        const conversation = this.#activeConversation;

        // Add user message
        this.#addUserMessage(conversation, content);
        this.#waitingForResponse = true;
        await this.render(false);

        // Get AI response
        const model = game.settings.get('aide', 'ChatModel');
        const context = await this.#determineContext(content);

        try {
            await this.#generateAIResponse(conversation, model, context);
            await this.#streamAIResponse(conversation);
        } catch (error) {
            this.#handleGenerationError(conversation, error);
        } finally {
            this.#currentGeneration = null;
        }

        // Name conversation if needed
        if (conversation.title === 'New Conversation') {
            await this.#generateConversationTitle(conversation, model);
        }

        // Finalize
        await this.conversationStore.update(conversation);
        this.#waitingForResponse = false;
        await this.render(false);
    }
}
