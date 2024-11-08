import { Chat } from './chat.js';

export async function renderChatWithAIButton(app, html, conversationStore, chatClient,
    embeddingClient, vectorStore, documentManager) {
    if (!(app instanceof JournalDirectory)) {
        return;
    }

    const targetElement = html.find('.header-actions');
    if (targetElement.length === 0) {
        return;
    }

    const template = await renderTemplate('modules/aide/templates/sidebar/ChatWithAI.hbs');
    targetElement.append(template);

    const button = targetElement.find('.aide.chat-with-ai');
    button.click(() => {
        new Chat(conversationStore, chatClient, embeddingClient, vectorStore, documentManager)
            .render(true);
    });
}
