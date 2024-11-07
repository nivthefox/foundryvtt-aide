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

        game.settings.set('aide', 'ChatModel', chatModel);
        game.settings.set('aide', 'EmbeddingModel', embeddingModel);

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
            embeddingModel: game.settings.get('aide', 'EmbeddingModel'),
            embeddingModels: (await aide.embeddingClient.getEmbeddingModels())
                .reduce((acc, model) => {
                    acc[model] = model;
                    return acc;
                }, {}),
        };
    }
}
