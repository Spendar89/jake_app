import 'babel-polyfill';
import moment from 'moment';

export default class Dispatcher {
  constructor ({ store, actions, handlers, validators, config={ debug: true }}) {
    this.store = store;
    this.actions = actions;
    this.handlers = handlers
    this.validators = validators;
    this.config = config;
  };

  _history: [];

  _logs: [];

  _currentAction: false;

  _getRemoteAction () {
    const key = this._currentAction;

    return this.actions.remote[key];
  };

  async _handleRemote (remote, local, input) {
    const output = await remote(this.store, input)
    const _input = { ...input, ...output };

    if (!local) return _input;

    return this._handleLocal(local, _input, true);
  };

  _handleLocal (local, input, hasRemote) {
    const output = local(this.store, input);

    return { ...input, ...output };
  };

  async dispatch ({ key, payload={} }, _actions) {
    const actions = _actions || this.handlers[key]; // array of action keys

    let validator = this.config.debug && this.validators[key]; // skip validation in prod

    // call dispatcher.validate if validator obj is registered for handler
    let validation = validator && this.validate(validator, payload);

    // initial input value is set to payload and validator result, letting
    // you handle validation state via validation value in action.
    let input = { validation, ...payload };

    // throw an error if no actions exists for given key
    if (!actions) {
      throw `
      An event with key ${key} does not exist.
      Make sure it is spelled correctly, in both your component and actions.`;
    };

    if (!_actions) this.actionTimes = {};

    for (let action of actions) {
      try {
        let start = new Date();

        // specify a conditional action by including an object in your
        // actions array with a getter as its key and the usual action
        // string as its value.
        if (typeof action === 'object') {
          const [[ _key='', _actions ]] = _.pairs(action);
          const _path = _key.split('.');
          const shouldDispatch = this.store.get(_path);

          if (shouldDispatch) {
            input = await this.dispatch({
              key: _key,
              payload: input
            }, _actions);

            action = `${_key}: \n \t${_actions.join(', \n \t')}`;
          } else {
            action = `${_key}: false`;
          };
        };

        if (typeof action === 'function') {
          action();

          action = 'fx:' + action;
        };

        if (!_actions) this._currentAction = action;

        // validate input after each action
        validation = validator && this.validate(validator, input);
        input = { ...input, validation };

        let local = this.actions.local[action];
        let remote = this.actions.remote[action];
        let shouldRedirect = !local && !remote && action.match(/^\//);

        if (local) {
          input = this._handleLocal(local, input);
        };

        if (remote) {
          // remote actions are async, so 'wait' for result (does not block)
          input = await this._handleRemote(remote, local, input);
        };

        if (shouldRedirect) {
          route(action, input);
          break;
        };

        let actionTime = this._getActionTime(start);
        this._setActionTime(actionTime);
      }
      catch (e) {
        console.error('Error in %s: %s', action, e.message);
      };
    };

    if (this.config.debug) {
      this.log(key, actions, input, validation); // log handler result in console
      this._record();
    };

    return input;
  };

  validate (validators={}, input, validationTypes={}) {
    const store = this.store;

    return _.reduce(validators, (validation, validator, key) => {
      if (!validator.required && !_.has(input, key)) {
        return validation;
      };

      const path = key.split('.');
      const i = _.get(input, path);

      _.set(validation, path, _.reduce(validator, (result, rule, type) => {
        const validateByType = validationTypes[type] || validationTypes.default;

        result[type] = validateByType(rule, i, path, input, store);

        return result;
      }, {}));

      return validation;
    }, {});
  };

  _getActionTime (start) {
    let key = this._currentAction;
    let time = moment((moment().diff(start))).milliseconds();

    return time + '' + 'ms';
  };

  _setActionTime (time) {
    this.actionTimes[this._currentAction] = time;
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
  log (event, actions, input, validation) {
    const entry = { event, input };

    //Util.styleLogHeader(`Handling Event ${this._logs.length}`)
    //Util.styleLogObject(entry)
    //Util.styleLogHeader('action execution times:')
    //Util.styleLogObject(this.actionTimes)

    //_.each(validation, (v, k) => {
      //Util.styleLogHeader(`validated ${k}`);
      //Util.styleLogObject(v);
    //});

    //console.log("\n");

    this._logs.push(entry);
  };
};
