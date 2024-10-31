import SETTINGS_REGISTRY from './settings.json';

export class Settings {
    #module;
    #context;

    constructor(context, module) {
        this.#context = context;
        this.#module = module;

        // Initialize all settings from registry
        Object.entries(SETTINGS_REGISTRY).forEach(([key, config]) => {
            this[key] = config.default;
        });
    }

    changeSettings(setting, value) {
        if (!(setting in SETTINGS_REGISTRY)) {
            throw new Error(`Invalid setting: ${setting}`);
        }

        this[setting] = value;
    }

    registerSettings() {
        Object.entries(SETTINGS_REGISTRY).forEach(([key, config]) => {
            this.#registerSetting(key, config);
        });

        Object.entries(SETTINGS_REGISTRY).forEach(([key, config]) => {
            this[key] = this.#context.game.settings.get(this.#module, key);
        });
    }

    /**
     * Helper method to register settings with common defaults
     * @private
     */
    #registerSetting(key, config) {
        if (!(key in SETTINGS_REGISTRY)) {
            throw new Error(`Invalid setting: ${key}`);
        }

        const type = config.type === 'Number'
            ? new this.#context.foundry.data.fields.NumberField({
                nullable: false,
                ...config.range  // spread min, max, step directly into the options
            })
            : String;

        this.#context.game.settings.register(this.#module, key, {
            name: `${this.#module}.settings.${key}.name`,
            hint: `${this.#module}.settings.${key}.hint`,
            scope: config.scope,
            config: true,
            requiresReload: true,
            type,
            choices: config.choices,
            default: config.default,
            onChange: value => this.changeSettings(key, value)
        });
    }
}
