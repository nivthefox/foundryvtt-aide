export const context = {
    FilePicker,
    Hooks,
    fetch: fetch.bind(window),
    fromUuid: fromUuid.bind(window),

    get foundry() { return foundry; },
    get game() { return game; },
};
