import combine from 'rollup-plugin-combine';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import match from 'rollup-plugin-match';
import nodeResolve from "@rollup/plugin-node-resolve";
import * as yaml from 'js-yaml';


const banner = `/**
 * Copyright 2024 Kevin Kragenbrink, II
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/
`

const main = {
    input: 'src/main.js',
    output: {
        file: 'aide.js',
        format: 'es',
        sourcemap: true,
        banner
    },
    plugins: [
        json({
            preferConst: true
        }),
        nodeResolve({
            browser: true
        }),
        copy({
            targets: [
                {
                    src: ['./src/lang/*.yaml'],
                    dest: './lang',
                    transform: (content, src, dest) => {
                        const lang = yaml.load(content, { schema: yaml.JSON_SCHEMA });
                        return JSON.stringify(lang, null, 2);
                    },
                    rename: (name, ext, srcPath) => `${name}.json`
                }
            ]
        }),
    ],
    watch: {
        include: ['src/**/*.js', 'src/lang/*.yaml'],
    }
};

const tests = {
    input: 'src/**/*.test.js',
    output: {
        file: 'aide.test.js',
        format: 'es',
        sourcemap: true,
        banner
    },
    plugins: [
        match(),
        combine(),
        json({
            preferConst: true
        }),
        nodeResolve({
            browser: true,
        }),
    ],
    watch: {
        include: ['src/**/*.test.js', 'src/app/Quench.js']
    }
}

export default [main, tests];
