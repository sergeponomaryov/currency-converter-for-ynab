const path = require('path');
const webpack = require('webpack');
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  entry: './src/main.js',
  mode: process.env.NODE_ENV || 'development',
  output: {
    filename: 'build.js',
    publicPath: '/dist/',
    path: path.resolve(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: ['vue-loader']
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new VueLoaderPlugin()
  ],
  devServer: {
    compress: true,
    public: 'currency-converter-for-ynab.glitch.me'
  }
};
