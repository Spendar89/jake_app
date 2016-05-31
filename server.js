const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./webpack.config');

const opts = {
  publicPath: config.output.publicPath,
  hot: true,
  historyApiFallback: true
};

const webpackDevServer = new WebpackDevServer(
  webpack(config),
  opts
);

const port = 8080;

const cb = err => err
  ? console.log(err)
  : console.log('Listening at port', port);

webpackDevServer.listen(port, 'localhost', cb);

