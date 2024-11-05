import {Logger, LogLevels} from './logger';
import {Store as ConversationStore} from '../conversation/store';
import {Settings} from '../settings/settings';
import {renderChatWithAIButton} from '../ui/sidebar';

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
        this.conversationStore = new ConversationStore(ctx);

        ctx.Hooks.once('setup', () => this.setup());
        ctx.Hooks.once('ready', () => this.ready());
        ctx.Hooks.on('renderSidebarTab', (app, html) => renderChatWithAIButton(app, html));
    }

    async ready() {
        this.logger.debug('Version %s Ready', this.version);
    }

    async setup() {
        this.settings.registerSettings();
    }
}
