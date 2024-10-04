module.exports = function (options) {
  return {
    ...options,
    stats: "minimal", // This disables the full-screen mode and simplifies the output
  };
};
