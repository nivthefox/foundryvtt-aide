const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class ChatSettings extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: 'aide-settings',
        position: {},
        window: {
            title: 'AIde Settings',
            icon: 'fas fa-sliders',
            minimizable: false,
            resizable: false
        },
        actions: {
            apply: ChatSettings.apply,
            cancel: ChatSettings.cancel,
        }
    };

    static PARTS = {
        form: {
            template: 'modules/aide/templates/applications/Settings.hbs'
        }
    };

    static apply(event, target) {
        const html = document.getElementById('aide-settings');

        const chatModel = html.querySelector('.chat-model').value;
        const embeddingModel = html.querySelector('.embedding-model').value;
        const temperature = html.querySelector('.temperature').value;
        const maxTokens = html.querySelector('.max-tokens').value;
        const topP = html.querySelector('.top-p').value;
        const topK = html.querySelector('.top-k').value;
        const frequencyPenalty = html.querySelector('.frequency-penalty').value;
        const presencePenalty = html.querySelector('.presence-penalty').value;

        game.settings.set('aide', 'ChatModel', chatModel);
        game.settings.set('aide', 'EmbeddingModel', embeddingModel);
        game.settings.set('aide', 'ChatTemperature', temperature);
        game.settings.set('aide', 'ChatMaxTokens', maxTokens);
        game.settings.set('aide', 'ChatTopP', topP);
        game.settings.set('aide', 'ChatTopK', topK);
        game.settings.set('aide', 'ChatFrequencyPenalty', frequencyPenalty);
        game.settings.set('aide', 'ChatPresencePenalty', presencePenalty);

        this.close();
    }

    static cancel(event, target) {
        this.close();
    }

    async _preparePartContext(partId, context) {
        return {
            chatModel: game.settings.get('aide', 'ChatModel'),
            chatModels: (await aide.chatClient.getChatModels())
                .reduce((acc, model) => {
                    acc[model] = model;
                    return acc;
                }, {}),
            temperature: game.settings.get('aide', 'ChatTemperature'),
            maxTokens: game.settings.get('aide', 'ChatMaxTokens'),
            topP: game.settings.get('aide', 'ChatTopP'),
            topK: game.settings.get('aide', 'ChatTopK'),
            frequencyPenalty: game.settings.get('aide', 'ChatFrequencyPenalty'),
            presencePenalty: game.settings.get('aide', 'ChatPresencePenalty'),
            embeddingModel: game.settings.get('aide', 'EmbeddingModel'),
            embeddingModels: (await aide.embeddingClient.getEmbeddingModels())
                .reduce((acc, model) => {
                    acc[model] = model;
                    return acc;
                }, {}),
        };
    }
}
