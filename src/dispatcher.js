import 'babel-polyfill';
import moment from 'moment';
import { ERRORS } from './constants';
import * as plugins from './plugins';

export default class Dispatcher {
  constructor ({ store = {}, actions = {}, config = { debug: true } }) {
    this.store = store;
    this.actions = actions;
    this.config = config;
    this.registeredPlugins = this.registerPlugins();
  };

  _history: [];

  _logs: [];

  _currentActionName: false;

  async _handleRemoteAction (remote, local, input) {
    const output = await remote(this.store, input)
    const _input = { ...input, ...output };

    if (!local) return _input;

    return this._handleLocalAction(local, _input, true);
  };

  _handleLocalAction (local, input, hasRemote) {
    const output = local(this.store, input);

    return { ...input, ...output };
  };

// TODO: Conditional Actions will become custom dispatch functions

  async dispatch ({ key, payload = {} }) {
    let { local={}, remote={} } = this.actions || {};
    let actionNames = this.handlers[key];
    let input = payload;

    async function handleAction (i) {
      const actionName = actionNames[i];
      const localAction = local[actionName];
      const remoteAction = remote[actionName];

      if (localAction) {
        input = this._handleLocalAction(localAction, input);
      };

      if (remoteAction) {
        input = await this._handleRemoteAction(
          remoteAction,
          localAction,
          input
        );
      };

      if (i < actionNames.length) {
        requestAnimationFrame(handleAction.bind(this, i+1));
      };

      // TODO: mutate store and commit/fire change event
    };

    requestAnimationFrame(handleAction.bind(this, 0));
  };

  registerPlugins () {
    if (this.registeredPlugins) return false;

    for (let name in plugins) {
      console.log('heeey')
      const { register } = plugins[name];

      if (typeof register === 'function') {
        register(this.dispatch);
      };
    };

    return true;
  };

  _record () {
    const serialized = this.store.get();
    const history = this._history.push(serialized);

    return history;
  };

  timeTravel (i) {
    const state = this._history[i];

    if (!state) return false;

    this.store = state;

    return this.store.get()
  };

  /**
   *
   * log
   *
   * logger function, used for debugging in dev console.
   * NOTE: Can be turned off via dispatcher.debug = false
   *
   */
  log (event, actions, input) {
    const entry = { event, input };

    //Util.styleLogHeader(`Handling Event ${this._logs.length}`)
    //Util.styleLogObject(entry)
    //Util.styleLogHeader('actionName execution times:')
    //console.log("\n");

    this._logs.push(entry);
  };
};
