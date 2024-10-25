import {id} from '../../module.json';

const suites = [];

export function Suite(id, suite) {
    suites.push({id, suite});
}

Hooks.once('quenchReady', quench => {
    for (const suite of suites) {
        quench.registerBatch(`${id}.${suite.id}`, context => suite.suite(context));
    }
});
