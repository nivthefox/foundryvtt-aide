import {App} from './app/app.js';
import {id, title, version} from '../module.json';

Hooks.once('init', () => {
    const app = new App(id, title, version)

    Hooks.once('setup', () => app.setup());
    Hooks.once('ready', () => app.ready());
});
