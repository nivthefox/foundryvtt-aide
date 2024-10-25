export const LogLevels = Object.freeze({
    Error: 0,
    Warn: 1,
    Info: 2,
    Debug: 3,
});

let LoggerInstance = null;

class StackTrace extends Error {}

export class Logger {
    name;
    level;
    facility = console;

    constructor(name, level) {
        if (typeof name !== 'string' || name.length === 0) {
            throw new Error('Logger must have a name');
        }

        if (!Object.values(LogLevels).includes(level)) {
            throw new Error('Logger must have a level');
        }

        this.name = name;
        this.level = level;
        LoggerInstance = this;
    }

    static getLogger(...args) {
        if (LoggerInstance === null) {
            const [name, level] = args;
            LoggerInstance = new Logger(name, level);
        }
        return LoggerInstance;
    }

    debug(format, ...args) {
        if (this.level >= LogLevels.Debug) {
            const trace = new StackTrace();
            this.facility.groupCollapsed(`${this.name} | ${format}`, ...args);
            this.facility.debug(trace.stack);
            this.facility.groupEnd();
        }
    }

    info(format, ...args) {
        if (this.level >= LogLevels.Info) {
            this.facility.info(`${this.name} | ${format}`, ...args);
        }
    }

    group(format, ...args) {
        this.facility.group(`${this.name} | ${format}`, ...args);
    }

    groupCollapsed(format, ...args) {
        this.facility.groupCollapsed(`${this.name} | ${format}`, ...args);
    }

    groupEnd() {
        this.facility.groupEnd();
    }

    warn(format, ...args) {
        if (this.level >= LogLevels.Warn) {
            this.facility.warn(`${this.name} | ${format}`, ...args);
        }
    }

    error(format, ...args) {
        if (this.level >= LogLevels.Error) {
            this.facility.error(`${this.name} | ${format}`, ...args);
        }
    }
}
