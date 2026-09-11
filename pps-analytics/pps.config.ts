import type { ExpectedCurriculum } from "./src/types";

const config = {
  contentDir: "../content/pages",
  years: [
    {
      title: "año 1",
      courses: [
        "álgebra y geometría",
        "algoritmos y estructuras de datos",
        "análisis de sistemas",
        "técnicas de comunicación y storytelling",
        "bases de datos",
        "análisis matemático i",
        "antropología",
        "programación i",
        "filosofía",
      ],
    },
    {
      title: "año 2",
      courses: ["estadística i", "matemática discreta"],
    },
  ],
} satisfies ExpectedCurriculum;

export default config;
