const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class Chat extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: 'aide',
        position: {
            width: 960,
            height: 800,
        },
        window: {
            title: 'AIde',
            icon: 'fas fa-robot',
            minimizable: true,
            resizable: true,
        }
    };

    static PARTS = {
        sidebar: {
            classes: ['sidebar'],
            template: 'modules/aide/templates/applications/ChatSidebar.hbs'
        },
        chat: {
            classes: ['chat'],
            template: 'modules/aide/templates/applications/Chat.hbs'
        },
    };

    async _preparePartContext(partId, context) {
        switch (partId) {
            case 'sidebar':
                return this.#prepareSidebar();
            case 'chat':
                return this.#prepareChat();
        }
    }

    async #prepareChat() {
        const data = {
            title: 'Mock Chat Conversation',
            placeholder: 'Reply to AIde...',
            messages: [
                {
                    user: {
                        name: 'Niv',
                        type: 'user',
                    },
                    isUserMessage: true,
                    content: '<p>Quick! Name the Halfling that stole the ring!</p>',
                    time: {
                        display: '2 minutes ago',
                        timestamp: Date.now() - 120000
                    }
                },
                {
                    user: {
                        name: 'AIde',
                        type: 'assistant',
                    },
                    isUserMessage: false,
                    content: '<p>Bilbo Baggins</p>',
                    time: {
                        display: 'now',
                        timestamp: Date.now()
                    }
                },
                {
                    user: {
                        name: 'Niv',
                        type: 'user',
                    },
                    isUserMessage: true,
                    content: '<p>Correct!</p>',
                    time: {
                        display: 'now',
                        timestamp: Date.now()
                    }
                },
                {
                    user: {
                        name: 'AIde',
                        type: 'assistant',
                    },
                    isUserMessage: false,
                    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sagittis ultricies bibendum. Vivamus aliquet enim nec ultrices congue. Phasellus luctus dapibus volutpat. Suspendisse at rutrum lorem. Proin blandit, turpis non molestie suscipit, felis mauris varius neque, vel accumsan nisi ligula non lectus. Vestibulum aliquet, felis non aliquam sagittis, ante ex eleifend mi, ut lacinia urna est quis arcu. Donec magna urna, ultricies varius odio vel, scelerisque imperdiet diam. Maecenas sagittis laoreet ligula eget vehicula. Mauris ac efficitur sapien, ac elementum elit. Donec tempor quam nec metus fermentum, vitae faucibus justo sodales. Morbi ut turpis eu nibh euismod rutrum nec at arcu. Nulla in pharetra sem. Vestibulum id ipsum pulvinar, mattis orci eget, viverra eros.\n'
                        + '\n'
                        + 'Proin interdum ac mi quis vulputate. Mauris sollicitudin nulla nec lorem vestibulum, eu viverra nisl commodo. Praesent gravida leo in enim convallis ornare. Nullam sed augue augue. Donec porta commodo arcu et convallis. Aenean mauris tortor, dapibus vitae pharetra nec, euismod vel risus. Nam ut malesuada ex. Donec facilisis tellus in enim vulputate, sodales convallis lorem rhoncus. Aliquam quis augue congue, sollicitudin dolor vel, commodo massa. Sed eu eros nec sem ullamcorper dictum. Mauris vel felis vulputate tortor tempor ultricies. Phasellus nec odio tincidunt, venenatis nibh vitae, tincidunt enim.\n'
                        + '\n'
                        + 'Ut nec posuere lacus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. In maximus sem non felis bibendum tempus. Proin ut mi eget ipsum varius laoreet. Cras tortor nibh, malesuada nec mollis id, rutrum et nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Pellentesque dictum orci augue, et aliquam massa auctor eu.',
                    time: {
                        display: 'now',
                        timestamp: Date.now()
                    }
                }
            ],
            context: {
                expanded: false,
                documents: [
                    {
                        id: 'test-id',
                        title: 'Test Document',
                    },
                    {
                        id: 'test-id-2',
                        title: 'Test Document 2',
                    }
                ]
            }
        };

        Object.entries(CONST.SHOWDOWN_OPTIONS).forEach(([k, v]) => showdown.setOption(k, v));
        const converter = new showdown.Converter(CONST.SHOWDOWN_OPTIONS);
        data.messages.forEach(m => m.content = converter.makeHtml(m.content));

        return data;
    }

    async #prepareSidebar() {
        return [
            {
                title: 'Mock Chat Conversation',
                messages: 4,
                time: {
                    display: '2 minutes ago',
                    timestamp: Date.now() - 120000
                },
                user: {
                    name: 'Niv',
                },
                active: true
            },
            {
                title: 'Another Conversation',
                messages: 1,
                time: {
                    display: '5 minutes ago',
                    timestamp: Date.now() - 300000
                },
                user: {
                    name: 'Rob',
                }
            },
            {
                title: 'A Third Conversation',
                messages: 2,
                time: {
                    display: '10 minutes ago',
                    timestamp: Date.now() - 600000
                },
                user: {
                    name: 'Niv',
                }
            }
        ];
    }
}
