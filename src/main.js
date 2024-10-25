import {App} from './app/App.js';
import {id, title, version} from '../module.json';

Hooks.once('init', () => {
    const app = new App(id, title, version)

    Hooks.once('setup', () => app.setup());
    Hooks.once('ready', () => app.ready());
});
