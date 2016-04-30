import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import App from './components/app';

ReactDOM.render(
  <AppContainer
    component={App}
  />,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./components/app', () => {
    ReactDOM.render(
      <AppContainer component={require('./components/app').default} />,
      document.getElementById('root')
    );
  });
};
