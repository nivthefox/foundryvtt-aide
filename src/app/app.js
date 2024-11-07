import {Logger, LogLevels} from './logger';
import {DocumentManager} from '../document/manager';
import {Settings} from '../settings/settings';
import {Store as ConversationStore} from '../conversation/store';
import {VectorStore} from '../document/vector_store';

import {renderChatWithAIButton} from '../ui/sidebar';
import {Client} from '../ai/client';

export class App {
    id;
    name;
    version;

    logger;
    settings;

    constructor(ctx, id, title, version) {
        this.id = id;
        this.name = title;
        this.version = version;

        this.logger = Logger.getLogger(this.name, LogLevels.Debug);
        this.settings = new Settings(ctx, this.id);

        ctx.Hooks.once('setup', () => this.setup(ctx, id));
        ctx.Hooks.once('ready', () => this.ready(ctx, id));
        ctx.Hooks.on('renderSidebarTab', (app, html) =>
            renderChatWithAIButton(app, html, this.conversationStore, this.chatClient));
    }

    async ready() {
        this.logger.debug('Version %s Ready', this.version);
    }

    async setup(ctx, id) {
        this.settings.registerSettings();

        // Initialize Clients and Stores
        const providerSettings = this.settings.getProviderSettings();
        this.chatClient = Client.create(providerSettings.chat);
        this.embeddingClient = Client.create(providerSettings.embedding);
        this.conversationStore = new ConversationStore(ctx);
        this.vectorStore = new VectorStore(ctx);

        // Initialize Document Manager
        const managerSettings = this.settings.getDocumentManagerSettings();
        this.documentManager = new DocumentManager(ctx, managerSettings, this.embeddingClient, this.vectorStore);

        // todo: only rebuild if necessary
        await this.documentManager.rebuildVectorStore();

        // Initialize Conversation Store
        await this.conversationStore.initialize();

        // Register model choices
        const chatModels = await this.chatClient.getChatModels();
        this.settings.setChoices('ChatModel', chatModels);

        const embeddingModels = await this.embeddingClient.getEmbeddingModels();
        this.settings.setChoices('EmbeddingModel', embeddingModels);
    }
}
