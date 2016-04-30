const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./webpack.config');

const options = {
  publicPath: config.output.publicPath,
  hot: true,
  historyApiFallback: true
};

const webpackDevServer = new WebpackDevServer(
  webpack(config),
  options
);

webpackDevServer.listen(3000, 'localhost', function (err, result) {
  if (err) return console.log(err);

  console.log('Listening at http://localhost:3000/');
});

