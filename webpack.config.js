// docs: http://webpack.github.io/docs/

var HappyPack = require('happypack');
const minimist = require('minimist');
var ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');
const args = minimist(process.argv.slice(2));

let plugins = [];
plugins.push(new HappyPack({
  id: 'ts',
  threads: 2,
  loaders: [
      {
          path: 'ts-loader',
          query: { happyPackMode: true }
      }
  ]
}));

plugins.push(new ForkTsCheckerWebpackPlugin({ checkSyntacticErrors: true }));

module.exports = {
  mode: 'development',
  context: __dirname,
  entry: {
    'hacksimgames': './src/main.ts',
  },
  output: {
    path: path.join(__dirname, 'dist/js/'),
    publicPath: 'dist/js/',
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    minimize: false,
    splitChunks: false
  },
  module: {
    rules: [
      {
        test: /\.ts$|\.js$/,
        exclude: ['dist', 'libs', 'node_modules'],
        loader: 'happypack/loader?id=ts'
      }
    ]
  },
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*'
      // 'Access-Control-Allow-Origin': 'http://10.0.2.2:8181' // swap this in for testing exemplar site on IE VMs
    },
    disableHostCheck: true
  },  
  plugins: plugins,
  devtool: 'source-map'
};