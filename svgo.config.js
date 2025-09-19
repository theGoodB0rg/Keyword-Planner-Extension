module.exports = {
  multipass: true,
  js2svg: { pretty: true },
  plugins: [
    "preset-default",
    {
      name: "removeViewBox",
      active: false
    }
  ]
};