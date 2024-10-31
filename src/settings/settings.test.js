import { Suite } from '../../test/quench';
import { Settings } from './settings';
import { MockFoundry } from '../foundry.mock';
import SETTINGS_REGISTRY from './settings.json';
import jsmock from '../../test/jsmock';

const { MockController } = jsmock;

Suite('settings', SettingsTest);
export default function SettingsTest(quench) {
    const { describe, it, assert, beforeEach } = quench;

    let settings;
    let ctrl;
    let mockFoundry;

    beforeEach(() => {
        ctrl = new MockController(quench);
        mockFoundry = new MockFoundry(ctrl);
        mockFoundry.EXPECT().foundry.AnyTimes().Return(window.foundry);
    });

    describe('registration', () => {
        beforeEach(() => {
            Object.entries(SETTINGS_REGISTRY).forEach(([key, defaultSettings]) => {
                mockFoundry.EXPECT().game.settings.register('test', key, jsmock.AnyObject).Do((module, key, config) => {
                    assert.equal(config.name, `test.settings.${key}.name`);
                    assert.equal(config.hint, `test.settings.${key}.hint`);
                    assert.equal(config.scope, defaultSettings.scope);
                    assert.equal(config.config, true);
                    assert.equal(config.requiresReload, true);
                    assert.equal(config.default, defaultSettings.default);
                    if (defaultSettings.choices) {
                        assert.deepEqual(config.choices, defaultSettings.choices);
                    }
                });
                mockFoundry.EXPECT().game.settings.get('test', key).Do((namespace, key) => defaultSettings.default);
            });
        });

        it('registers all settings from registry', () => {
            settings = new Settings(mockFoundry, 'test');
            settings.registerSettings();

            Object.entries(SETTINGS_REGISTRY).forEach(([key, defaultSettings]) => {
                assert.equal(settings[key], defaultSettings.default);
            });
        });

        it('changes settings', () => {
            settings = new Settings(mockFoundry, 'test');
            settings.registerSettings();

            settings.changeSettings('ChatModel', 'test-model');
            assert.equal(settings.ChatModel, 'test-model');
        });

        it('throws on invalid setting name', () => {
            settings = new Settings(mockFoundry, 'test');
            settings.registerSettings();

            assert.throws(() => {
                settings.changeSettings('InvalidSetting', 'value');
            }, /Invalid setting/);
        });
    });

    describe('number settings', () => {
        beforeEach(() => {
            Object.entries(SETTINGS_REGISTRY).forEach(([key, defaultSettings]) => {
                mockFoundry.EXPECT().game.settings.register('test', key, jsmock.AnyObject).Do((module, key, config) => {
                    if (defaultSettings.type === 'Number') {
                        assert.ok(config.type instanceof foundry.data.fields.NumberField);
                        assert.deepEqual(config.type.options, {
                            nullable: false,
                            min: defaultSettings.range.min,
                            max: defaultSettings.range.max,
                            step: defaultSettings.range.step
                        });
                    }
                });
                mockFoundry.EXPECT().game.settings.get('test', key).Return(defaultSettings.default);
            });
        });

        it('configures number fields correctly', () => {
            settings = new Settings(mockFoundry, 'test');
            settings.registerSettings();
        });
    });

    describe('choice settings', () => {
        beforeEach(() => {
            Object.entries(SETTINGS_REGISTRY).forEach(([key, defaultSettings]) => {
                mockFoundry.EXPECT().game.settings.register('test', key, jsmock.AnyObject).Do((module, key, config) => {
                    if (defaultSettings.choices) {
                        assert.equal(config.type, String);
                        assert.deepEqual(config.choices, defaultSettings.choices);
                    }
                });
                mockFoundry.EXPECT().game.settings.get('test', key).Return(defaultSettings.default);
            });
        });

        it('configures choice fields correctly', () => {
            settings = new Settings(mockFoundry, 'test');
            settings.registerSettings();
        });
    });
}
