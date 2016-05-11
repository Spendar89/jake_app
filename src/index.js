import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import Root from './components/root';
import * as plugins from './plugins';

global.plugins = plugins;

ReactDOM.render(
  <AppContainer component={ Root }/>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./components/root', _ => {
    ReactDOM.render(
      <AppContainer component={ require('./components/root').default }/>,
      document.getElementById('root')
    );
  });
};
