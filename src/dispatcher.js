const page = require('page');
const VALIDATION_TYPES = require('validation_types');

export default class Dispatcher {
  constructor (events, actions, routes, listeners, sockets, validators, store) {
    this.routes = routes;
    this.listeners = listeners;
    this.sockets = sockets;
    this.handlers = { 
      ...events, 
      ...routes, 
      ...listeners, 
      ...sockets
    };
    this.actions = actions;
    this.validators = validators;
    this.store = global.currentStore = store;
    this.history = [];
    this.logs = [];
    this.debug = this.store.get('debug');
    this.currentAction = false;
    global.timeTravel = this.timeTravel.bind(this);

    this.registerRoutes();
    this.registerListeners();
    this.registerSockets();
  };

  _getRemoteAction () {
    const key = this.currentAction;
    return this.actions.remote[key];
  };

  async _handleRemote (remote, local, input) {
    const output = await remote(this.store, input)

    input = { ...input, ...output };

    if (!local) return input;

    return this._handleLocal(local, input, true);
  };

  _handleLocal (local, input, hasRemote) {
    const output = local(this.store, input);
    return { ...input, ...output };
  };

  /**
   *
   * dispatch
   *
   * calls lcoal and remote action functions specified 
   * in handler, and commits changes to store.
   *
   * @return {object} new store value after updates.
   *
   */
  async dispatch ({ key, payload={} }, _actions) {
    const actions = _actions || this.handlers[key]; // array of action keys

    let validator = this.debug && this.validators[key]; // skip validation in prod

    // call dispatcher.validate if validator obj is registered for handler
    // TODO: when inValid, specify which type of validation failed, 
    // e.g required, type, custom validate function, etc.
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
        let start = moment();
        // Conditional Actions:
        // specify a conditional action by including an object 
        // in your actions array with a getter as its key and 
        // the usual action string as its value.
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

        if (!_actions) this.currentAction = action;

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
          this.store.commit();
          // remote actions are async, so 'wait' for result (does not block)
          input = await this._handleRemote(remote, local, input);
        };

        if (shouldRedirect) {
          route(action, input);
          break;
        };

        let actionTime = this.getActionTime(start);
        this.setActionTime(actionTime);
      }
      catch (e) {
        console.error('Error in %s: %s', action, e.message);
      };
    };

    // commit updated store to trigger async 
    // update events, which rerenders components
    const state = this.store.commit();

    if (this.debug) {
      this.log(key, actions, input, validation); // log handler result in console

      this.record(state); // add state to history for timetravel
    };

    return input;
  };

  validate (validators={}, input) {
    const store = this.store;

    return _.reduce(validators, (validation, validator, key) => {
      if (!validator.required && !_.has(input, key)) {
        return validation;
      };

      const path = key.split('.');
      const i = _.get(input, path);

      _.set(validation, path, _.reduce(validator, (result, rule, type) => {
        const validateByType = VALIDATION_TYPES[type] || VALIDATION_TYPES.default;

        result[type] = validateByType(rule, i, path, input, store); 

        return result;
      }, {}));

      return validation;
    }, {});
  };

  /**
   * registerListeners
   *
   * passively update state by registering event-listeners 
   * for cursors specified in listerner-keys
   */
  registerListeners () {
    for (let key in this.listeners) {
      // multiple cursor paths are separated by commas,
      // for registering single listener on multiple cursors
      const pathStrings = key.split(',');

      // register listener for each path
      for (let pathString of pathStrings) {
        // nested cursors are separated by periods,
        // so call split to ocnvert string to array
        const path = pathString.split('.');
        const cursor = this.store.select(path);

        // if cursor exists at path, initiate a listener
        // that will dispatch an event for the current
        // listener-key and cursor-data 
        cursor && cursor.on('update', ({ data: payload }) => {
          this.dispatch({ 
            key, 
            payload 
          });
        });
      };
    };
  };

  /**
   * registerRoutes
   *
   * update app state by registering the keys of 
   * this.routes object with page.js router
   */
  registerRoutes () {
    for (let key in this.routes) {
      page(key, ({ params }) => {
        // get current parsed query string object
        const qs = Util.getQueryString();
        // payload is the result of merging route 
        // params and query string objects
        const payload = { ...params, ...qs };

        this.dispatch({
          key,
          payload
        });
      });
    };
  };

  registerSockets () {
    for (let key in this.sockets) {
      socket.on(key, payload => {
        this.dispatch({
          key,
          payload
        });
      });
    }
  }

  getActionTime (start) {
    let key = this.currentAction;
    let time = moment((moment().diff(start))).milliseconds();

    return time + '' + 'ms';
  };

  setActionTime (time) {
    this.actionTimes[this.currentAction] = time;
  };

  record (state) {
    const serialized = state.serialize();
    const history = this.history.push(serialized);

    return history;
  };

  timeTravel (i) {
    const state = this.history[i];

    if (!state) return false;

    this.store.merge(state);

    return this.store
    .commit()
    .serialize();
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

    Util.styleLogHeader(`Handling Event ${this.logs.length}`)
    Util.styleLogObject(entry)
    Util.styleLogHeader('action execution times:')
    Util.styleLogObject(this.actionTimes)

    _.each(validation, (v, k) => {
      Util.styleLogHeader(`validated ${k}`);
      Util.styleLogObject(v); 
    });

    console.log("\n");

    this.logs.push(entry);
  };
};
