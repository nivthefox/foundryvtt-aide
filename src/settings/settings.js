import SETTINGS_REGISTRY from './settings.json';

export class Settings {
    #module;
    #context;
    #choices = {};

    constructor(ctx, module) {
        this.#context = ctx;
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

    getDocumentManagerSettings() {
        return {
            ChunkSize: this.#context.game.settings.get(this.#module, 'ChunkSize'),
            ChunkOverlap: this.#context.game.settings.get(this.#module, 'ChunkOverlap'),
            EmbeddingModel: this.#context.game.settings.get(this.#module, 'EmbeddingModel'),
        };
    }

    getProviderSettings() {
        const settings = {
            chat: {
                provider: this.#context.game.settings.get(this.#module, 'ChatProvider'),
                apiKey: this.#context.game.settings.get(this.#module, 'ChatAPIKey'),
                baseURL: this.#context.game.settings.get(this.#module, 'ChatBaseURL'),
            },
            embedding: {
                provider: this.#context.game.settings.get(this.#module, 'EmbeddingProvider'),
                apiKey: this.#context.game.settings.get(this.#module, 'EmbeddingAPIKey'),
                baseURL: this.#context.game.settings.get(this.#module, 'EmbeddingBaseURL'),
            }
        };

        try {
            settings.chat.model = this.#context.game.settings.get(this.#module, 'ChatModel');
            settings.embedding.model = this.#context.game.settings.get(this.#module, 'EmbeddingModel');
        } catch (e) {
            // ignore
        }

        return settings;
    }

    registerSettings() {
        Object.entries(SETTINGS_REGISTRY)
            .forEach(([key, config]) => {
                if ((key === 'ChatModel'
                        && (this.ChatProvider === 'default' || this.ChatProvider === ''))
                    || (key === 'EmbeddingModel'
                        && (this.EmbeddingProvider === 'default' || this.EmbeddingProvider === ''))) {
                    return;
                }

                this.#registerSetting(key, config);
                this[key] = this.#context.game.settings.get(this.#module, key);

            });
    }

    setChoices(key, values) {
        this.#choices[key] = values.reduce((acc, value) => {
            acc[value] = value;
            return acc;
        }, {});
    }

    /**
     * Helper method to register settings with common defaults
     * @private
     */
    #registerSetting(key, config) {
        if (!(key in SETTINGS_REGISTRY)) {
            throw new Error(`Invalid setting: ${key}`);
        }

        let type;
        switch (config.type) {
            case 'Number':
                type = new this.#context.foundry.data.fields.NumberField({
                    nullable: false,
                    ...config.range  // spread min, max, step directly into the options
                });
                break;
            case 'String':
                type = String;
                break;
            case 'StringField':
                type = new this.#context.foundry.data.fields.StringField({
                    choices: () => this.#choices[key],
                    nullable: false,
                    ...config.options
                });
                break;
            default:
                type = String;
        }

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
