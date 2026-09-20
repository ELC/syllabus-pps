const { resolve } = require("node:path");

/** @type {import("../../src/types").ExpectedCurriculum} */
module.exports = {
  contentDir: resolve(__dirname, "content/pages"),
  years: [],
};
