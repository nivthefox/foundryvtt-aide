export const context = {
    FilePicker,
    Hooks,
    fetch: fetch.bind(window),

    get foundry() { return foundry; },
    get game() { return game; },
};
