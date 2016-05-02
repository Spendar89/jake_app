import React, { Component } from 'react';
import { Provider } from 'react-redux';

export default class App extends Component {
  render() {
    const dude = 'bro',
        { store } = this.props;

    return (
      <Provider store={store}>
        <div>
          <h1>Hello, { dude }.</h1>
        </div>
      </Provider>
    );
  }
};
