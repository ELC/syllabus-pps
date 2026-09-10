const { resolve } = require("node:path");

/** @type {import("../../src/types").ExpectedCurriculum} */
module.exports = {
  contentDir: resolve(__dirname, "content/pages"),
  years: [
    {
      title: "año 1",
      courses: ["algoritmos y estructuras de datos", "programación i"],
    },
  ],
};
