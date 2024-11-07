import {ChatSettings} from './settings.js';
import { DateTime } from 'luxon';

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class Chat extends HandlebarsApplicationMixin(ApplicationV2) {
    // Class Properties
    #activeConversation;
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
            delete: Chat.deleteConversation,
            load: Chat.loadConversation,
            new: Chat.newConversation,
            rename: Chat.rename,
            send: Chat.sendMessage,
            settings: Chat.openChatSettings,
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
    constructor(conversationStore, chatClient, options = {}) {
        super(options);
        this.chatClient = chatClient;
        this.conversationStore = conversationStore;
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
    #bindEditorEvents(editorContent, placeholderText, sendButton, proseMirror) {
        this.#setupFocusEvents(editorContent, placeholderText);
        this.#setupContentObserver(editorContent, placeholderText, sendButton);
        this.#setupKeyboardShortcuts(proseMirror, sendButton);
        this.#setupRenameEvent(this.element);
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

    #getEditorElements(html) {
        return {
            editorContent: html.querySelector('.editor-content'),
            placeholderText: html.querySelector('.placeholder-text'),
            sendButton: html.querySelector('.send'),
            proseMirror: html.querySelector('prose-mirror')
        };
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

    static openChatSettings(event, target) {
        new ChatSettings().render(true);
    }

    static async sendMessage(event, target) {
        const proseMirror = this.element.querySelector('prose-mirror');
        const editorContent = this.element.querySelector('.editor-content');
        if (!proseMirror || !editorContent || !editorContent.innerText.trim().length) return;
        const content = this.#formatMessageContent(editorContent.innerHTML);
        if (!content) return;

        const conversation = this.#activeConversation;

        // Add user message
        conversation.messages.push({
            role: 'user',
            content,
            time: DateTime.now().toUTC().toMillis(),
        });

        // Clear input and update UI
        editorContent.innerHTML = '';
        this.#waitingForResponse = true;
        await this.render(false);

        // Get AI response
        const model = game.settings.get('aide', 'ChatModel');
        const response = await this.chatClient.generate(model, [],
            this.#activeConversation.title, conversation.messages, true);

        // Initialize AI message
        conversation.messages.push({
            user: 'AIde',
            role: 'assistant',
            content: '',
            time: DateTime.now().toUTC().toMillis(),
        });
        await this.render(false);

        // Stream AI response
        const conversationElement = this.element.querySelector('.conversation');
        const contentElement = conversationElement.querySelector('.message:last-of-type .content');
        const idx = conversation.messages.length - 1;

        for await (const message of response) {
            conversation.messages[idx].content += message;
            conversation.messages[idx].time = DateTime.now().toUTC().toMillis();
            contentElement.innerHTML = this.converter.makeHtml(conversation.messages[idx].content);
            conversationElement.scrollTop = conversationElement.scrollHeight;
        }

        // Name the conversation if it's unnamed
        if (conversation.title === 'New Conversation') {
            const response = await this.chatClient.generate(model, [],
                conversation.title, [
                    ...conversation.messages,
                    {
                        role: 'user',
                        content: 'Provide a name for this conversation of 50 characters or less. Put the name in an HTML <title> element.',
                        time: DateTime.now().toUTC().toMillis()
                    }
                ], false);

            conversation.title = response.match(/<title>(.*?)<\/title>/)[1];
        }

        // Finalize
        await this.conversationStore.update(conversation);
        this.#waitingForResponse = false;
        await this.render(false);
    }
}
