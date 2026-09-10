import type { ExpectedCurriculum } from "./src/types";

const config = {
  contentDir: "../content/pages",
  years: [
    {
      title: "año 1",
      courses: ["algoritmos y estructuras de datos", "programación i"],
    },
  ],
} satisfies ExpectedCurriculum;

export default config;
