import {Logger, LogLevels} from './logger';
import {Settings} from '../settings/settings';

export class App {
    id;
    name;
    version;

    logger;
    settings;

    constructor(id, title, version) {
        this.id = id;
        this.name = title;
        this.version = version;

        const context = window;

        this.logger = Logger.getLogger(this.name, LogLevels.Debug);
        this.settings = new Settings(context, this.id);
    }

    async ready() {
        this.logger.debug('Version %s Ready', this.version);
    }

    async setup() {
        this.settings.registerSettings();
    }
}
