import {App} from './app/app.js';
import {context} from './foundry/context.js';
import {id, title, version} from '../module.json';

Hooks.once('init', () => {
    window.aide = new App(context, id, title, version)
});
