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
        ctx.Hooks.on('renderSidebarTab', async (app, html) => await this.renderSidebarButton(app, html));
    }

    async ready(ctx, id) {
        this.logger.debug('Version %s Ready', this.version);
    }

    async setup(ctx, id) {
        this.settings.registerSettings();

        // Initialize Clients and Stores
        const providerSettings = this.settings.getProviderSettings();
        if (providerSettings.chat.provider === 'default' || providerSettings.embedding.provider === 'default'
            || providerSettings.chat.provider === '' || providerSettings.embedding.provider === '') {
            this.logger.error('Chat and Embedding providers must be set in the settings');
            return;
        }

        this.chatClient = Client.create(providerSettings.chat);
        this.embeddingClient = Client.create(providerSettings.embedding);
        this.conversationStore = new ConversationStore(ctx);

        const lookups = game.settings.get('aide', 'VectorStoreLookups');
        const maxWeight = game.settings.get('aide', 'VectorStoreMaxWeight');
        const queryBoostFactor = game.settings.get('aide', 'VectorStoreQueryBoostFactor');
        this.vectorStore = new VectorStore(lookups, maxWeight, queryBoostFactor);

        // Initialize Document Manager
        const managerSettings = this.settings.getDocumentManagerSettings();
        this.documentManager = new DocumentManager(ctx, managerSettings, this.embeddingClient, this.vectorStore);

        // Register model choices
        const chatModels = await this.chatClient.getChatModels();
        this.settings.setChoices('ChatModel', chatModels);

        const embeddingModels = await this.embeddingClient.getEmbeddingModels();
        this.settings.setChoices('EmbeddingModel', embeddingModels);

        // Initialize Conversation Store
        await this.conversationStore.initialize();

        // todo: only rebuild if necessary
        await this.documentManager.rebuildVectorStore();
    }

    async renderSidebarButton(app, html) {
        await renderChatWithAIButton(app, html, this.conversationStore, this.chatClient,
            this.embeddingClient, this.vectorStore, this.documentManager);
    }
}
