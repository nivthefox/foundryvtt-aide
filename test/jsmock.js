/**
 * @typedef {Object} Mock - A mock object
 * @property {() => MockRecorder} EXPECT - Expect a method to be called
 * @example
 * ```javascript
 * class MockFibonacci {
 *   #ctrl;
 *   #recorder;
 *
 *   constructor(ctrl) {
 *     this.#ctrl = ctrl;
 *     this.#recorder = new MockFibonacciRecorder(this);
 *   }
 *
 *   EXPECT() {
 *     return this.#recorder;
 *   }
 *
 *   seq(n) {
 *     return this.#ctrl.call(this, "seq", n);
 *   }
 *
 *   async seqAsync(n) {
 *     return await this.#ctrl.callAsync(this, "seqAsync", n);
 *   }
 * }
 * ```
 */

/**
 * A mock recorder is used to record the expected calls on a mock object
 * @typedef {Object} MockRecorder - A mock recorder
 * @example
 * ```javascript
 * class MockFibonacciRecorder {
 *   #ctrl;
 *   #mock;
 *
 *   constructor(ctrl, mock) {
 *     if (!(mock instanceof MockFibonacci)) {
 *       throw new Error("mock must be an instance of MockFibonacci");
 *     }
 *     this.#ctrl = ctrl;
 *     this.#mock = mock;
 *   }
 *
 *   seq(n) {
 *     return this.#ctrl.recordCall(this.#mock, "seq", n);
 *   }
 * }
 * ```
 */

/**
 * @typedef {Object} TestHarness
 * @property {() => void} afterEach - A function to run after each test
 */

/**
 * @typedef {(any) => boolean} matcher - A matcher
 */
const matchers = {
    Any: () => true,
    AnyString: (arg) => typeof arg === 'string',
    AnyNumber: (arg) => typeof arg === 'number',
    AnyBoolean: (arg) => typeof arg === 'boolean',
    AnyArray: (arg) => Array.isArray(arg),
    AnyObject: (arg) => arg !== null && typeof arg === 'object' && !Array.isArray(arg),
    AnyFunction: (arg) => typeof arg === 'function',
    AnyAsyncFunction: (arg) => arg instanceof Promise,
    AnyError: (arg) => arg instanceof Error,
    AnyNull: (arg) => arg === null,
    AnyVoid: (arg) => arg === undefined,

    ArrayOf: (matcher) => (arg) => Array.isArray(arg) && arg.every(matcher),
    InstanceOf: (type) => (arg) => arg instanceof type,
    Matches: (regex) => (arg) => regex.test(String(arg)),
    Satisfies: (predicate) => predicate,
}

/**
 * MockController is the main class for creating and managing mocks.
 * It is used by a mock object to call methods and record expected calls.
 */
class MockController {
    #expectedCalls = [];
    #finished = false;

    /**
     * @param {TestHarness} t
     */
    constructor(t) {
        t.afterEach(() => this.finish());
    }

    /**
     * call is called by a mock. It should not be called by user code.
     */
    call(receiver, method, ...args) {
        const expectedCall = this.#expectedCalls.find(call => {
            return call.receiver === receiver
                && call.method === method
                && call.matches(args)
        });

        if (!expectedCall) {
            throw new UnexpectedCallError(method, args);
        }

        if (expectedCall.exhausted()) {
            throw new ExhaustedCallError(method, args);
        }

        return expectedCall.execute(args);
    }

    /**
     * callAsync is called by a mock. It should not be called by user code.
     */
    async callAsync(receiver, method, ...args) {
        const expectedCall = this.#expectedCalls.find(call => {
            return call.receiver === receiver
                && call.method === method
                && call.matches(args)
        });

        if (!expectedCall) {
            throw new UnexpectedCallError(method, args);
        }

        if (expectedCall.exhausted()) {
            throw new ExhaustedCallError(method, args);
        }

        return await expectedCall.executeAsync(args);
    }

    /**
     * finish checks to see if all the methods that were expected were called
     *
     * It is not idempotent and therefore can only be invoked once.
     */
    finish(cleanup = false) {
        this.#expectedCalls.forEach(call => {
            if (!call.satisfied()) {
                throw new UnsatisfiedCallError(call.method, call.args);
            }
        });

        if (cleanup) {
            this.#expectedCalls = [];
        }

        this.#finished = true;
    }

    /**
     * recordCall is called by a mock. It should not be called by user code.
     * @param {Mock} receiver
     * @param {string} method
     * @param {Array<any>} args
     * @returns {Call}
     */
    recordCall(receiver, method, ...args) {
        const recv = Reflect.getPrototypeOf(receiver);

        if (method.split('.').length > 1) {
            const path = method.split('.');
            const last = path.pop();
            const obj = path.reduce((acc, key) => acc[key], receiver);
            if (typeof obj[last] !== 'function') {
                throw new MethodNotFoundError(method);
            }
        }
        else if (typeof recv[method] !== 'function') {
            throw new MethodNotFoundError(method);
        }

        const call = new Call(receiver, method, ...args);
        this.#expectedCalls.push(call);
        return call;
    }

    /**
     * recordPropertyCall is called by a mock. It should not be called by user code.
     */
    recordPropertyCall(receiver, property) {
        const recv = Reflect.getPrototypeOf(receiver);
        if (recv.__lookupGetter__(property) === undefined) {
            throw new MethodNotFoundError(property);
        }

        const call = new Call(receiver, property);
        this.#expectedCalls.push(call);
        return call;
    }
}

/**
 * Call is a class that represents an expected call on a mock object.
 */
class Call {

    /**
     * @type {matcher[]}
     */
    args = [];
    /**
     * @type {Array<(...any) => any>}
     */
    #actions = [];
    /**
     * @type {number}
     */
    #maxCalls;
    /**
     * @type {string}
     */
    method;
    /**
     * @type {number}
     */
    #minCalls;
    /**
     * @type {number}
     */
    #numCalls;
    /**
     * @type {Call[]}
     */
    #preReqs = [];
    /**
     * @type {(...any) => any}
     */
    receiver;

    /**
     * @param {Mock} receiver
     * @param {string} method
     * @param {Array<any>} args
     */
    constructor(receiver, method, ...args) {
        this.receiver = receiver;
        this.method = method;
        this.args = args;
        this.#minCalls = 1;
        this.#maxCalls = 1;
        this.#numCalls = 0;
    }

    /**
     * AnyTimes allows the expectation to be called 0 or more times.
     * @returns {Call}
     */
    AnyTimes() {
        this.#minCalls = 0;
        this.#maxCalls = Number.MAX_SAFE_INTEGER;
        return this;
    }

    /**
     * MinTimes allows the expectation to be called at least n times.
     * @param {number} n
     * @returns {Call}
     */
    MinTimes(n) {
        this.#minCalls = n;
        return this;
    }

    /**
     * MaxTimes allows the expectation to be called at most n times.
     * @param {number} n
     * @returns {Call}
     */
    MaxTimes(n) {
        this.#maxCalls = n;
        return this;
    }

    /**
     * Times allows the expectation to be called exactly n times.
     * @param {number} n
     * @returns {Call}
     */
    Times(n) {
        this.#minCalls = n;
        this.#maxCalls = n;
        return this;
    }

    /**
     * DoAndReturn declares the action to run when the call is matched.
     * The return values from this function are returned by the mocked function.
     * It takes an any argument to support n-arity functions.
     * The anonymous function must match the function signature mocked method.
     * @param {(...any) => any} action
     * @returns {Call}
     */
    DoAndReturn(action) {
        this.#validateAction(action);
        this.#actions.push(action);
        return this;
    }

    /**
     * Do declares the action to run when the call is matched.
     * The return values from this function are ignored. To use the return
     * values, use DoAndReturn.
     * It takes an any argument to support n-arity functions.
     * The anonymous function must match the function signature mocked method.
     * @param {(...any) => void} action
     * @returns {Call}
     */
    Do(action) {
        this.#validateAction(action);
        this.#actions.push(action);
        return this;
    }

    /**
     * Return declares the value to be returned by the mocked function.
     * @param {any} ret
     * @returns {Call}
     */
    Return(ret) {
        this.#actions.push(() => ret);
        return this;
    }

    /**
     * After declares the call may only match after preReq has been exhausted.
     * @param {Call} preReq
     */
    After(preReq) {
        this.#preReqs.push(preReq);
        return this;
    }

    /**
     * execute is called by the MockController to execute the expected call.
     * It should not be called by user code.
     * @param {any[]} args
     * @returns {any}
     */
    execute(args) {
        this.#numCalls++;

        if (this.#preReqs.some(preReq => !preReq.satisfied())) {
            throw new Error('Pre-requisite not satisfied');
        }

        let returnValue = undefined;
        for (const action of this.#actions) {
            const ret = action(...args);
            if (ret !== undefined) {
                returnValue = ret;
            }
        }

        return returnValue;
    }

    /**
     * executeAsync is called by the MockController to execute the expected call.
     * It should not be called by user code.
     * @param {any[]} args
     * @returns {any}
     */
    async executeAsync(args) {
        this.#numCalls++;

        if (this.#preReqs.some(preReq => !preReq.satisfied())) {
            throw new Error('Pre-requisite not satisfied');
        }

        let returnValue = undefined;
        for (const action of this.#actions) {
            const ret = await action(...args);
            if (ret !== undefined) {
                returnValue = ret;
            }
        }
        return returnValue;
    }

    /**
     * satisfied checks if the expected call has been satisfied.
     * @returns {boolean}
     */
    satisfied() {
        return this.#numCalls >= this.#minCalls && this.#numCalls <= this.#maxCalls;
    }

    /**
     * exhausted checks if the expected call has been exhausted.
     * @returns {boolean}
     */
    exhausted() {
        return this.#numCalls >= this.#maxCalls;
    }

    /**
     *
     */

    /**
     * Validates if this expectation matches the actual call
     * @param {any[]} args
     * @returns {boolean}
     */
    matches(args) {
        if (args.length !== this.args.length) {
            return false;
        }

        return this.args.every((expected, i) => {
            const actual = args[i];

            // If expected is a matcher function, use it
            if (typeof expected === 'function') {
                return expected(actual);
            }

            // Otherwise do deep equality
            return deepEquals(expected, actual);
        });
    }

    /**
     * Validates the action function
     * @param action
     * @throws {Error} if the action is not a function or does not have the same
     *                  arity as the mocked method
     */
    #validateAction(action) {
        if (typeof action !== 'function') {
            throw new Error('Action must be a function');
        }

        if (action.length !== this.args.length) {
            throw new Error('Action must have the same arity as the mocked method');
        }
    }
}

class MockError extends Error {
    constructor(message) {
        super(message);
        this.name = "MockError";
    }
}

class ExhaustedCallError extends MockError {
    constructor(method, args) {
        super(`Call to ${method} with arguments ${JSON.stringify(args)} has already been exhausted`);
        this.name = "ExhaustedCallError";
    }
}

class MethodNotFoundError extends MockError {
    constructor(method) {
        super(`Method ${method} not found on object`);
        this.name = "MethodNotFoundError";
    }
}

class UnexpectedCallError extends MockError {
    constructor(method, args) {
        super(`Unexpected call to ${method} with arguments ${JSON.stringify(args)}`);
        this.name = "UnexpectedCallError";
    }
}

class UnsatisfiedCallError extends MockError {
    constructor(method, args) {
        super(`Call to ${method} with arguments ${JSON.stringify(args)} was not satisfied`);
        this.name = "UnsatisfiedCallError";
    }
}

const jsmock = {
    ...matchers,

    MockController,
    MockError,
    ExhaustedCallError,
    MethodNotFoundError,
    UnexpectedCallError,
    UnsatisfiedCallError
};
export default jsmock;

function deepEquals(a, b) {
    if (a === b) return true;

    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (let key of keysA) {
        if (!keysB.includes(key) || !deepEquals(a[key], b[key])) {
            return false;
        }
    }

    return true;
}
