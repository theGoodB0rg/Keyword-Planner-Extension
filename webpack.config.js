const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    sidebar: './src/sidebar.tsx',
    background: './src/background.ts',
    contentScript: './src/contentScript.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/sidebar.html',
      filename: 'sidebar.html',
      chunks: ['sidebar']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/manifest.json', to: '.' },
        // Copy default icons from public (source of truth today)
        { from: 'public/icons', to: 'icons', noErrorOnMissing: true },
        // If the new assets pipeline (PR #1) is present, prefer those icons by copying after
        { from: 'assets/dist/icons', to: 'icons', noErrorOnMissing: true }
      ]
    })
  ],
  devtool: 'source-map'
}; 