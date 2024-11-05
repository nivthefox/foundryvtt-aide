import { Suite } from '../../test/quench';
import { Store } from './store';
import { MockContext } from '../foundry/context.mock';
import { MockFilePicker } from '../foundry/file_picker.mock';
import { MockGame } from '../foundry/game.mock';
import { MockSocket } from '../foundry/socket.mock';
import { MockUtils } from '../foundry/utils.mock';
import jsmock from '../../test/jsmock';

const { MockController } = jsmock;

Suite('conversation.store', StoreTest);
export default function StoreTest(quench) {
    const { describe, it, assert, beforeEach } = quench;

    let ctrl;
    let mockContext;
    let mockFilePicker;
    let mockUtils;
    let mockGame;
    let mockSocket;
    let store;

    beforeEach(() => {
        ctrl = new MockController(quench);
        mockContext = new MockContext(ctrl);
        mockFilePicker = new MockFilePicker(ctrl);
        mockUtils = new MockUtils(ctrl);
        mockGame = new MockGame(ctrl);
        mockSocket = new MockSocket(ctrl);

        // Set up game context
        mockContext.game = mockGame;
        mockGame.EXPECT().world.Return({ id: 'test-world' }).AnyTimes();
        mockGame.EXPECT().socket.Return(mockSocket).AnyTimes();

        // Mock foundry utils
        mockContext.EXPECT().foundry.Return({ utils: mockUtils }).AnyTimes();

        // Inject FilePicker into context
        mockContext.FilePicker = mockFilePicker;
        MockFilePicker.instance = mockFilePicker;

        store = new Store(mockContext);
    });

    describe('initialization', () => {
        it('creates conversation directory if missing', async () => {
            const expectedPath = 'worlds/test-world/conversations';

            let calls = 0;
            mockFilePicker.EXPECT().browse('data', expectedPath)
                .Do((source, path) => {
                    if (calls++ === 0) {
                        throw new Error('Directory not found');
                    }

                    return { files: [] };
                }).Times(2);

            mockFilePicker.EXPECT().createDirectory('data', expectedPath, {})
                .Return(true);

            mockSocket.EXPECT().on('module.aide', jsmock.AnyFunction);

            await store.initialize();
            assert.equal(store.conversations().length, 0);
        });

        it('loads existing conversations on initialization', async () => {
            const expectedPath = 'worlds/test-world/conversations';

            mockFilePicker.EXPECT().browse('data', expectedPath).Times(2)
                .Return({
                    files: [
                        'worlds/test-world/conversations/user1.conv1.json',
                        'worlds/test-world/conversations/user2.conv2.json',
                        'worlds/test-world/conversations/invalid.file.txt'
                    ]
                });
            mockSocket.EXPECT().on('module.aide', jsmock.AnyFunction);

            await store.initialize();

            const conversations = store.conversations();
            assert.equal(conversations.length, 2);
            assert.deepEqual(conversations[0], {
                id: 'conv1',
                userId: 'user1',
                loaded: false
            });
            assert.deepEqual(conversations[1], {
                id: 'conv2',
                userId: 'user2',
                loaded: false
            });
        });

        it('throws error if directory creation fails', async () => {
            const expectedPath = 'worlds/test-world/conversations';

            mockFilePicker.EXPECT().browse('data', expectedPath)
                .Do((source, path) => { throw new Error('Directory not found'); });

            mockFilePicker.EXPECT().createDirectory('data', expectedPath, {})
                .Return(false);

            try {
                await store.initialize();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.match(error.message, /Failed to create conversation directory/);
            }
        });
    });

    describe('conversation management', () => {
        describe('creation', () => {
            it('creates new conversation with default values', async () => {
                const expectedConversation = {
                    id: 'generated-id',
                    userId: 'user1',
                    title: 'New Conversation',
                    messages: [],
                    context: [],
                    format: 1,
                };

                mockUtils.EXPECT().randomID()
                    .Return('generated-id');

                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.Satisfies(file =>
                        file.name === 'user1.generated-id.json'
                        && file.type === 'application/json'
                        && file.size > 0
                    ),
                    {}
                ).Return({ path: 'worlds/test-world/conversations/user1.generated-id.json' });

                mockSocket.EXPECT().emit('module.aide', {
                    name: 'conversation.create',
                    data: expectedConversation
                }, jsmock.AnyVoid, jsmock.AnyVoid);

                const conversation = await store.create('user1');
                assert.deepEqual(conversation, {...expectedConversation, loaded: true});

                const conversations = store.conversations();
                assert.equal(conversations.length, 1);
                assert.deepEqual(conversations[0], {...expectedConversation, loaded: true});
            });

            it('throws error if upload fails', async () => {
                mockUtils.EXPECT().randomID()
                    .Return('generated-id');

                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.AnyObject,
                    {}
                ).Do((source, path, file, options) => {
                    throw new Error('Upload failed');
                });

                try {
                    await store.create('user1');
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.match(error.message, /Upload failed/);
                }
                assert.equal(store.conversations().length, 0);
            });
        });

        describe('retrieval', () => {
            it('loads conversation from file system when not cached', async () => {
                const storedConversation = {
                    id: 'conv1',
                    userId: 'user1',
                    title: 'Test Conversation',
                    messages: [],
                    context: [],
                    format: 1,
                };

                mockContext.EXPECT().fetch('/worlds/test-world/conversations/user1.conv1.json')
                    .Return({
                        ok: true,
                        json: async () => storedConversation
                    });

                const conversation = await store.get('user1', 'conv1');
                assert.deepEqual(conversation, {
                    ...storedConversation,
                    loaded: true
                });

                const conversations = store.conversations();
                assert.equal(conversations.length, 1);
                assert.equal(conversations[0].loaded, true);
            });

            it('returns cached conversation when already loaded', async () => {
                const storedConversation = {
                    id: 'conv1',
                    userId: 'user1',
                    title: 'Test Conversation',
                    messages: [],
                    context: [],
                    format: 1,
                };

                mockContext.EXPECT().fetch('/worlds/test-world/conversations/user1.conv1.json')
                    .Return({
                        ok: true,
                        json: async () => storedConversation
                    })
                    .Times(1);

                await store.get('user1', 'conv1');
                const conversation = await store.get('user1', 'conv1');
                assert.deepEqual(conversation, {
                    ...storedConversation,
                    loaded: true
                });
            });

            it('throws error if conversation cannot be found', async () => {
                mockContext.EXPECT().fetch('/worlds/test-world/conversations/user1.conv1.json')
                    .Return({
                        ok: false,
                        status: 404
                    });

                try {
                    await store.get('user1', 'conv1');
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.match(error.message, /File not found/);
                }
            });

            it('throws error if conversation data is invalid', async () => {
                mockContext.EXPECT().fetch('/worlds/test-world/conversations/user1.conv1.json')
                    .Return({
                        ok: true,
                        json: async () => { throw new SyntaxError('Invalid JSON'); }
                    });

                try {
                    await store.get('user1', 'conv1');
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert(error instanceof SyntaxError);
                }
            });
        });

        describe('updates', () => {
            it('saves updated conversation to file system', async () => {
                const conversation = {
                    id: 'conv1',
                    userId: 'user1',
                    title: 'Updated Conversation',
                    messages: ['test message'],
                    context: ['test context'],
                    format: 1,
                };

                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.Satisfies(file => file.name === 'user1.conv1.json' && file.type === 'application/json'),
                    {}
                ).Return({ path: '/worlds/test-world/conversations/user1.conv1.json' });

                mockSocket.EXPECT().emit('module.aide', {
                    name: 'conversation.update',
                    data: conversation
                }, jsmock.AnyVoid, jsmock.AnyVoid);

                await store.update(conversation);

                const conversations = store.conversations();
                assert.equal(conversations.length, 1);
                assert.deepEqual(conversations[0], {...conversation, loaded: true});
            });

            it('throws error if update upload fails', async () => {
                const conversation = {
                    id: 'conv1',
                    userId: 'user1',
                    title: 'Updated Conversation'
                };

                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.AnyObject,
                    {}
                ).Do((source, path, file, options) => {
                    throw new Error('Upload failed');
                });

                try {
                    await store.update(conversation);
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.match(error.message, /Upload failed/);
                }
            });
        });

        describe('deletion', () => {
            it('removes conversation by uploading empty file', async () => {
                // Add conversation first
                const storedConversation = {
                    id: 'conv1',
                    userId: 'user1',
                    title: 'Test Conversation',
                    loaded: true,
                    messages: [],
                    context: [],
                    format: 1,
                };

                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.Satisfies(file =>
                        file.name === 'user1.conv1.json'
                        && file.size > 0
                    ),
                    {}
                ).Return({ path: 'worlds/test-world/conversations/user1.conv1.json' });

                mockSocket.EXPECT().emit('module.aide', {
                    name: 'conversation.update',
                    data: storedConversation,
                }, jsmock.AnyVoid, jsmock.AnyVoid);

                mockSocket.EXPECT().emit('module.aide', {
                    name: 'conversation.delete',
                    data: { id: 'conv1' }
                }, jsmock.AnyVoid, jsmock.AnyVoid);

                await store.update(storedConversation);
                assert.equal(store.conversations().length, 1);

                // Now delete by uploading empty file
                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.Satisfies(file =>
                        file.name === 'user1.conv1.json'
                        && file.size === 0
                    ),
                    {}
                ).Return({ path: 'worlds/test-world/conversations/user1.conv1.json' });

                await store.delete('user1', 'conv1');
                assert.equal(store.conversations().length, 0);
            });

            it('throws error if deletion upload fails', async () => {
                mockFilePicker.EXPECT().upload(
                    'data',
                    'worlds/test-world/conversations',
                    jsmock.AnyObject,
                    {}
                ).Do((source, path, file, options) => {
                    throw new Error('Upload failed');
                });

                try {
                    await store.delete('user1', 'conv1');
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.match(error.message, /Upload failed/);
                }
            });
        });
    });
}
