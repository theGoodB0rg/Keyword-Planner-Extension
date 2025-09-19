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
  // Copy default icons from public (fallback/legacy)
  { from: 'public/icons', to: 'icons', noErrorOnMissing: true },
  // Copy the entire assets pipeline output if present (preferred)
  { from: 'assets/dist', to: 'assets/dist', noErrorOnMissing: true }
      ]
    })
  ],
  devtool: 'source-map'
}; 