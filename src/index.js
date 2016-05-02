import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import App from './components/app';
import rootReducer from './reducers';
import { compose, createStore } from 'redux';

const extensions = compose(
  window.devToolsExtension ? window.devToolsExtension() : f => f
);

const store = function (initialState) {
  const _store = createStore(rootReducer, initialState, extensions);

  if (module.hot) {
    module.hot.accept( './reducers', () =>{
      const _rootReducer = require('./reducers').default;

      store.replaceReducer(_rootReducer);
    });
  };

  return _store;
}();

const props = {
  component: App,
  props: { store }
};

ReactDOM.render(
  <AppContainer { ...props }/>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./components/app', () => {
    ReactDOM.render(
      <AppContainer { ...props } component={require('./components/app').default} />,
      document.getElementById('root')
    );
  });
};
