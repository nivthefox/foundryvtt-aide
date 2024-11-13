export class Emitter {
    #logger;
    #socket;

    constructor(ctx, logger) {
        this.#socket = ctx.game.socket;
        this.#logger = logger;
    }

    emit(event, ...args) {
        this.#logger.debug('Emitting event %s', event);
        this.#socket.emit('module.aide', {
            name: event,
            args
        });
    }

    on(eventName, listener) {
        this.#socket.on('module.aide', async event => {
            if (event.name === eventName) {
                this.#logger.debug('Received event %s', event.name);
                listener(...event.args);
            }
        });
    }
}
