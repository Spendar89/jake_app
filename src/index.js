import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import App from './app';

ReactDOM.render(
  <AppContainer
    component={App}
  />,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./app', () => {
    ReactDOM.render(
      <AppContainer
        component={require('./app').default}
      />,
      document.getElementById('root')
    );
  });
};
