const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');
const path = require("path");

module.exports = {
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: "build.js"
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  module: {
    rules: [{
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [{
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          },
          {
            loader: "sass-loader"
          }
        ]
      }
    ]
  },
  devtool: process.env.NODE_ENV === "production" ? false : "inline-source-map",
  devServer: {
    contentBase: "../dist",
    stats: "errors-only",
    compress: false,
    host: "localhost",
    port: 80
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html"
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ]
};