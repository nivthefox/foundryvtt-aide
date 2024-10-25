import {Logger, LogLevels} from './logger';

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

        this.logger = Logger.getLogger(this.name, LogLevels.Debug);
    }

    async ready() {
        this.logger.debug('Version %s Ready', this.version);
    }

    async setup() {
    }
}
