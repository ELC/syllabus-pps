# Propuesta de rediseño curricular LDS
> Estado: primera versión operativa derivada de los materiales locales provistos y de las decisiones de grilling. No usa fuentes web ni contenidos externos.
## 1. Alcance y reglas
- Fuente: se usaron exclusivamente los documentos locales listados en el proyecto.
- Criterio: distinguir `fuente`, `inferencia`, `hallazgo` y `propuesta`.
- Materias no técnicas: se mantienen visibles y fuera de alcance editorial; no se reescriben sus contenidos.
- Restricción de diseño: se conserva lista de materias, carga y año; se proponen secuencia, correlativas, contenidos y contratos entre cursos.
## 2. Fuentes
- `2026_LDS_Proyecto Nueva Carrera v1.1.docx`
- `TUP_A01C01/*`
- `TUP_A01C02/*`
- `TUP_A02C01/*`
- `TUP_A02C02/*`
- `Borrador Resolucion del Plan de Estudios LCD.docx`
- `Modelo de programa con ejemplo_.docx`

## 3. Decisiones de diseño acordadas
- LDS tendrá foco empresarial, práctico, time-to-market, inserción laboral y entrega de valor con productos funcionales.
- El egresado esperado será un contributor sólido, no un arquitecto empresarial autónomo.
- TUP se redefine como el ciclo inicial exacto de LDS; al cierre debe habilitar contribución junior full-stack.
- Algoritmos antecede a Programación I y usa diagramas de Nassi-Shneiderman; Programación I usa Python.
- IA generativa entra curricularmente en tercer año, en Programación Asistida por IA y Agentes.
- Testing formal se concentra en Calidad del Software, Testing y Performance; antes se exige verificación funcional mínima.
- DevOps se enfoca en Linux, automatización, contenedores, CI/CD y despliegue reproducible.
- Arquitectura e Ingeniería de Software se comparte con LCD con mismo programa y rúbrica, ofreciendo casos de software y de datos.
- TNE es una bolsa abierta de créditos; las materias listadas son trayectorias sugeridas, no catálogo exhaustivo.

## 4. Diagnóstico principal
| ID | Hallazgo | Evidencia | Riesgo | Propuesta |
| --- | --- | --- | --- | --- |
| H1 | Fragmentación de stacks | TUP actual salta de Python a C#/Angular y luego Java/React/Spring, además de Prolog/Erlang. | Riesgo de medir adaptación a herramientas más que progresión de competencias. | Definir un propósito explícito para cada cambio de stack o reutilizar stack en el integrador. |
| H2 | Orden inicial | LDS ubica Algoritmos antes de Programación I; el usuario lo ratificó pedagógicamente. | Debe evitarse que Algoritmos se vuelva teoría abstracta sin ejecución mental ni pruebas. | Usar Nassi-Shneiderman, trazas y casos de prueba; Programación I implementa luego en Python. |
| H3 | DevOps demasiado amplio | El programa actual mezcla Linux, scripting, Docker, Kubernetes, QA, arquitectura y CI/CD. | La amplitud impide dominio real y duplica cursos posteriores. | Enfocar en fundamentos operativos y despliegue reproducible. |
| H4 | Arquitectura compartida con LCD | LDS y LCD llegan con backgrounds distintos y no se puede mover LCD. | Un único caso puede perjudicar a una cohorte. | Mismo programa/rúbrica con casos equivalentes orientados a software o datos. |
| H5 | TNE ambiguo | El documento lo narra como flexible pero lista materias como obligatorias. | Puede confundirse trayectoria optativa con currículo troncal. | Definirlo como bolsa de créditos y documentar trayectorias sugeridas. |
| H6 | IA antes de fundamentos | El perfil LDS enfatiza IA, pero el usuario decidió postergar su uso curricular pleno hasta tercero. | Hay que evitar actividades evaluadas con IA en primer ciclo. | Reservar IA generativa para Programación Asistida por IA y Agentes. |
| H7 | Testing y robustez | Robustez de egreso se definió como producto funcional; testing formal queda en cuarto. | Los integradores tempranos igual necesitan verificación mínima. | Distinguir prueba de aceptación funcional de estrategia formal de testing. |
| H8 | Computer Vision sin contenidos | Aparece en TNE con horas/créditos pero sin anexo sintético. | No es ofrecible con trazabilidad suficiente. | Crear contenidos mínimos antes de recomendarla o marcarla como pendiente. |
| H9 | Duplicación Lean/UX/Agile | Gestión, UX y Product Development repiten MVP, research, story mapping y agile. | Riesgo de repetición improductiva. | Separar responsabilidades: gestión entrega, UX evidencia de usuario, Product Development discovery/market. |
| H10 | Puente de datos débil | Ingeniería de Datos depende de BD, pero requiere programación, datos y criterios de gobierno. | Puede aparecer como salto de modelado a plataforma. | Agregar contratos de entrada desde Programación, Estadística I y BD. |

## 5. Matriz propuesta por año y cuatrimestre

### Año 1
| Cod | Cuat. | Materia | Tipo | Rol |
| --- | --- | --- | --- | --- |
| 1 | 1 | Álgebra y Geometría | técnica | Base algebraica para cálculo, discreta y modelado formal. |
| 2 | 1 | Algoritmos y Estructuras de Datos | técnica integradora inicial | Primer curso de pensamiento computacional antes de codificar. |
| 3 | 1 | Análisis de Sistemas | técnica | Traduce problemas de negocio en requisitos, modelos y alcance. |
| 4 | 1 | Técnicas de Comunicación & Storytelling | no técnica / soporte | Comunicación profesional y presentación. |
| 5 | 2 | Bases de Datos | técnica | Persistencia relacional/NoSQL para productos de software. |
| 6 | 2 | Análisis Matemático I | técnica | Base de funciones, límites y derivadas para modelar cambio y optimización. |
| 7 | 2 | Antropología | no técnica | Formación humanística. |
| 8 | 2 | Programación I | técnica integradora anual | Convierte algoritmos en programas reales y cierra primer producto funcional. |
| 9 | 2 | Filosofía | no técnica | Formación humanística. |
### Año 2
| Cod | Cuat. | Materia | Tipo | Rol |
| --- | --- | --- | --- | --- |
| 10 | 1 | Introducción a DevOps | técnica | Herramientas operativas para trabajo profesional y despliegue. |
| 11 | 1 | Gestión de Proyectos | producto / gestión | Organiza trabajo, alcance, MVP, agile y planificación. |
| 12 | 1 | Programación II – Web Backend | técnica | Construye APIs y servicios con persistencia y autenticación. |
| 13 | 1 | Ética General | no técnica | Formación ética. |
| 17 | 1 | Matemática Discreta | técnica | Formaliza estructuras discretas usadas por algoritmos y programación. |
| 14 | 2 | Programación III – Web Frontend | técnica | Construye interfaces web modernas consumiendo APIs. |
| 15 | 2 | UX | técnica / producto | Asegura que el producto resuelva necesidades de usuarios. |
| 16 | 2 | Proyecto Laboratorio I | técnica integradora anual | Cierre TUP: producto web end-to-end desplegado. |
| 18 | 2 | Estadística I | técnica | Inicia lectura cuantitativa de datos para productos y decisiones. |
### Año 3
| Cod | Cuat. | Materia | Tipo | Rol |
| --- | --- | --- | --- | --- |
| 19 | 1 | Estadística II | técnica | Profundiza probabilidad y simulación. |
| 20 | 1 | Algoritmos Avanzados y Paradigmas de Programación | técnica | Eleva fundamentos desde estructuras a complejidad y paradigmas. |
| 21 | 1 | Product Development | producto / gestión | Conecta producto, mercado y validación. |
| 23 | 1 | Ingeniería de Datos | técnica | Convierte persistencia en pipelines y plataformas de datos. |
| 28 | 1 | Análisis Matemático II | técnica | Extiende cálculo para optimización, simulación y modelos. |
| 22 | 2 | Programación Asistida por IA y Agentes | técnica | Introduce IA generativa después de fundamentos. |
| 24 | 2 | Arquitectura e Ingeniería del Software | técnica integradora anual | Materia compartida con LCD; evalúa diseño de software y decisiones técnicas. |
| 25 | 2 | Cálculo Numérico y Simulación | técnica | Aplica matemática y estadística a modelos computacionales. |
| 26 | 2 | Teología I | no técnica | Formación teológica. |
| 27 | 2 | Teología II | no técnica | Formación teológica. |
### Año 4
| Cod | Cuat. | Materia | Tipo | Rol |
| --- | --- | --- | --- | --- |
| 29 | 1 | Proyecto Laboratorio II | técnica integradora final | Integra arquitectura, IA, producto y operación. |
| 30 | 1 | Calidad del Software, Testing y Performance | técnica | Formaliza calidad, pruebas y atributos no funcionales. |
| 31 | 1 | Entrepreneurship | producto / gestión | Traduce producto en oportunidad y salida al mercado. |
| 32 | 2 | Doctrina Social | no técnica | Formación social. |
| 33 | 2 | Ética Profesional y Aspectos Legales | no técnica / legal | Ética profesional y marco legal. |

## 6. Cadenas transversales
### Programación
`Algoritmos y Estructuras de Datos` → `Programación I` → `Programación II – Web Backend` → `Programación III – Web Frontend` → `Proyecto Laboratorio I` → `Algoritmos Avanzados y Paradigmas de Programación` → `Programación Asistida por IA y Agentes` → `Proyecto Laboratorio II`
### Datos
`Bases de Datos` → `Programación II – Web Backend` → `Proyecto Laboratorio I` → `Ingeniería de Datos` → `Programación Asistida por IA y Agentes` → `TNE: Cómputo en la Nube / Ciberseguridad`
### Matemática aplicada
`Álgebra y Geometría` → `Análisis Matemático I` → `Matemática Discreta` → `Estadística I` → `Estadística II` → `Análisis Matemático II` → `Cálculo Numérico y Simulación` → `TNE: Optimización e Investigación Operativa`
### Producto y UX
`Análisis de Sistemas` → `Gestión de Proyectos` → `UX` → `Proyecto Laboratorio I` → `Product Development` → `Entrepreneurship` → `Proyecto Laboratorio II`
### Arquitectura y operación
`Introducción a DevOps` → `Proyecto Laboratorio I` → `Arquitectura e Ingeniería del Software` → `Calidad del Software, Testing y Performance` → `TNE: Cloud / Infraestructura / Ciberseguridad`
### IA y agentes
`Fundamentos de programación y algoritmos` → `Algoritmos Avanzados y Paradigmas de Programación` → `Ingeniería de Datos` → `Programación Asistida por IA y Agentes` → `Proyecto Laboratorio II` → `TNE: Automatización / Computer Vision`

## 7. Contratos por curso
### 1. Álgebra y Geometría
- Tipo: técnica.
- Ubicación propuesta: año 1, cuatrimestre 1.
- Rol: Base algebraica para cálculo, discreta y modelado formal.
- Entrada esperada: Ninguno formal.
- Salida reusable: Sistemas lineales, matrices, vectores y razonamiento algebraico reutilizable.
- Propuesta: Mantener como fundamento matemático, conectando matrices y vectores con modelos de datos, gráficos y transformaciones.
### 2. Algoritmos y Estructuras de Datos
- Tipo: técnica integradora inicial.
- Ubicación propuesta: año 1, cuatrimestre 1.
- Rol: Primer curso de pensamiento computacional antes de codificar.
- Entrada esperada: Ninguno formal.
- Salida reusable: Diseño de algoritmos con Nassi-Shneiderman, estructuras básicas, trazas, casos de prueba y complejidad elemental.
- Propuesta: Usar diagramas de Nassi-Shneiderman como vehículo principal; evitar convertirla en una materia de sintaxis de lenguaje.
### 3. Análisis de Sistemas
- Tipo: técnica.
- Ubicación propuesta: año 1, cuatrimestre 1.
- Rol: Traduce problemas de negocio en requisitos, modelos y alcance.
- Entrada esperada: Ninguno formal.
- Salida reusable: Casos de uso, requerimientos, modelos de dominio y criterios de aceptación para integradores.
- Propuesta: Coordinar entregables con Programación I: cada ejercicio relevante debe tener problema, usuario y regla de negocio.
### 4. Técnicas de Comunicación & Storytelling
- Tipo: no técnica / soporte.
- Ubicación propuesta: año 1, cuatrimestre 1.
- Rol: Comunicación profesional y presentación.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Presentaciones, escritura y storytelling según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 5. Bases de Datos
- Tipo: técnica.
- Ubicación propuesta: año 1, cuatrimestre 2.
- Rol: Persistencia relacional/NoSQL para productos de software.
- Entrada esperada: Algoritmos básicos y programación inicial deseables.
- Salida reusable: Modelo ER, normalización, SQL, transacciones, seguridad y respaldo.
- Propuesta: Ubicar después de fundamentos de programación; conectar desde el inicio con ABM y posterior backend.
### 6. Análisis Matemático I
- Tipo: técnica.
- Ubicación propuesta: año 1, cuatrimestre 2.
- Rol: Base de funciones, límites y derivadas para modelar cambio y optimización.
- Entrada esperada: Álgebra y Geometría.
- Salida reusable: Funciones, continuidad, derivadas, optimización básica.
- Propuesta: Bajar a tierra con performance, crecimiento, tasas de cambio y modelos simples.
### 7. Antropología
- Tipo: no técnica.
- Ubicación propuesta: año 1, cuatrimestre 2.
- Rol: Formación humanística.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Contenidos humanísticos según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 8. Programación I
- Tipo: técnica integradora anual.
- Ubicación propuesta: año 1, cuatrimestre 2.
- Rol: Convierte algoritmos en programas reales y cierra primer producto funcional.
- Entrada esperada: Algoritmos con Nassi-Shneiderman.
- Salida reusable: Python, control de flujo, funciones, módulos, errores, POO inicial, archivos y persistencia básica.
- Propuesta: Usar Python. Integrador: aplicación funcional acotada que implemente casos modelados en Análisis de Sistemas y persistencia básica.
### 9. Filosofía
- Tipo: no técnica.
- Ubicación propuesta: año 1, cuatrimestre 2.
- Rol: Formación humanística.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Contenidos filosóficos según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 10. Introducción a DevOps
- Tipo: técnica.
- Ubicación propuesta: año 2, cuatrimestre 1.
- Rol: Herramientas operativas para trabajo profesional y despliegue.
- Entrada esperada: Programación I.
- Salida reusable: Git, Linux, scripting, contenedores, CI/CD y despliegue reproducible.
- Propuesta: Enfocar la materia: Kubernetes y cloud distribuido quedan como panorama o TNE, no como dominio obligatorio profundo.
### 11. Gestión de Proyectos
- Tipo: producto / gestión.
- Ubicación propuesta: año 2, cuatrimestre 1.
- Rol: Organiza trabajo, alcance, MVP, agile y planificación.
- Entrada esperada: Análisis de Sistemas.
- Salida reusable: Lean/MVP, user stories, planificación, Scrum/Kanban y seguimiento.
- Propuesta: Reducir duplicación con UX: Gestión se queda con coordinación, priorización y entrega; UX con investigación/interacción.
### 12. Programación II – Web Backend
- Tipo: técnica.
- Ubicación propuesta: año 2, cuatrimestre 1.
- Rol: Construye APIs y servicios con persistencia y autenticación.
- Entrada esperada: Programación I y Bases de Datos.
- Salida reusable: API REST, capas, DTO, ORM, autenticación/autorización básica.
- Propuesta: Debe entregar un backend consumible por Frontend y Proyecto Laboratorio I.
### 13. Ética General
- Tipo: no técnica.
- Ubicación propuesta: año 2, cuatrimestre 1.
- Rol: Formación ética.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Contenidos éticos según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 17. Matemática Discreta
- Tipo: técnica.
- Ubicación propuesta: año 2, cuatrimestre 1.
- Rol: Formaliza estructuras discretas usadas por algoritmos y programación.
- Entrada esperada: Álgebra y Algoritmos.
- Salida reusable: Lógica, conjuntos, relaciones, grafos, inducción, booleanos y estructuras algebraicas.
- Propuesta: Incluir conexiones explícitas: monoides, composición, reduce, tipos algebraicos cuando corresponda.
### 14. Programación III – Web Frontend
- Tipo: técnica.
- Ubicación propuesta: año 2, cuatrimestre 2.
- Rol: Construye interfaces web modernas consumiendo APIs.
- Entrada esperada: Programación I.
- Salida reusable: HTML/CSS, JS/TS, componentes, estado, routing y servicios.
- Propuesta: Coordinar con Backend para contratos de API; no duplicar UX más allá de implementación.
### 15. UX
- Tipo: técnica / producto.
- Ubicación propuesta: año 2, cuatrimestre 2.
- Rol: Asegura que el producto resuelva necesidades de usuarios.
- Entrada esperada: Análisis de Sistemas.
- Salida reusable: Research, arquitectura de información, flujos, prototipos, accesibilidad y testing UX.
- Propuesta: Mantener UX como fuente de evidencias de usuario para Proyecto Laboratorio I.
### 16. Proyecto Laboratorio I
- Tipo: técnica integradora anual.
- Ubicación propuesta: año 2, cuatrimestre 2.
- Rol: Cierre TUP: producto web end-to-end desplegado.
- Entrada esperada: Backend, Frontend, UX, Gestión y DevOps.
- Salida reusable: Producto web funcional con persistencia, autenticación, despliegue y defensa.
- Propuesta: Integrador de salida TUP. Debe evaluar contribución junior full-stack, no reiniciar otro stack sin justificación.
### 18. Estadística I
- Tipo: técnica.
- Ubicación propuesta: año 2, cuatrimestre 2.
- Rol: Inicia lectura cuantitativa de datos para productos y decisiones.
- Entrada esperada: Análisis Matemático I.
- Salida reusable: EDA, regresión, inferencia, intervalos e hipótesis.
- Propuesta: Conectar con métricas de producto, experimentos, performance y base de Ingeniería de Datos.
### 19. Estadística II
- Tipo: técnica.
- Ubicación propuesta: año 3, cuatrimestre 1.
- Rol: Profundiza probabilidad y simulación.
- Entrada esperada: Estadística I.
- Salida reusable: Probabilidad, Bayes, variables aleatorias, distribuciones y TCL.
- Propuesta: Preparar explícitamente Cálculo Numérico, Simulación, IA y análisis de incertidumbre.
### 20. Algoritmos Avanzados y Paradigmas de Programación
- Tipo: técnica.
- Ubicación propuesta: año 3, cuatrimestre 1.
- Rol: Eleva fundamentos desde estructuras a complejidad y paradigmas.
- Entrada esperada: Proyecto Laboratorio I.
- Salida reusable: Complejidad avanzada, P/NP, funcional, lógico, concurrente/paralelo.
- Propuesta: Concentrar aquí paradigma funcional y teoría de tipos; usar problemas pragmáticos y transferencia a stacks conocidos.
### 21. Product Development
- Tipo: producto / gestión.
- Ubicación propuesta: año 3, cuatrimestre 1.
- Rol: Conecta producto, mercado y validación.
- Entrada esperada: Análisis de Sistemas, Gestión y UX.
- Salida reusable: Design thinking, Lean Startup, prototipado, testeo y lanzamiento.
- Propuesta: Evitar repetir Gestión: foco en discovery, validación y decisiones de producto.
### 23. Ingeniería de Datos
- Tipo: técnica.
- Ubicación propuesta: año 3, cuatrimestre 1.
- Rol: Convierte persistencia en pipelines y plataformas de datos.
- Entrada esperada: Bases de Datos.
- Salida reusable: ETL, NoSQL, CAP, data lakes/warehouses, governance y Big Data.
- Propuesta: Agregar puente de programación y estadística aplicado; conectar con IA y TNE.
### 28. Análisis Matemático II
- Tipo: técnica.
- Ubicación propuesta: año 3, cuatrimestre 1.
- Rol: Extiende cálculo para optimización, simulación y modelos.
- Entrada esperada: Análisis Matemático I.
- Salida reusable: Integrales, multivariable, Lagrange, series y ecuaciones diferenciales.
- Propuesta: Bajar a tierra con simulación, optimización y análisis de sistemas dinámicos.
### 22. Programación Asistida por IA y Agentes
- Tipo: técnica.
- Ubicación propuesta: año 3, cuatrimestre 2.
- Rol: Introduce IA generativa después de fundamentos.
- Entrada esperada: Proyecto Laboratorio I y Algoritmos Avanzados deseable.
- Salida reusable: LLM para código, agentes, MCP, IA-first y responsabilidad.
- Propuesta: No anticipar uso curricular pleno de IA antes de esta materia.
### 24. Arquitectura e Ingeniería del Software
- Tipo: técnica integradora anual.
- Ubicación propuesta: año 3, cuatrimestre 2.
- Rol: Materia compartida con LCD; evalúa diseño de software y decisiones técnicas.
- Entrada esperada: DevOps y producto full-stack en LDS; base heterogénea en LCD.
- Salida reusable: Arquitecturas escalables, microservicios/cloud-native, requisitos funcionales/no funcionales e incertidumbre.
- Propuesta: Mismo programa y rúbrica para LDS/LCD, con casos equivalentes orientados a software o datos.
### 25. Cálculo Numérico y Simulación
- Tipo: técnica.
- Ubicación propuesta: año 3, cuatrimestre 2.
- Rol: Aplica matemática y estadística a modelos computacionales.
- Entrada esperada: Estadística II y Análisis Matemático II.
- Salida reusable: Error numérico, sistemas, interpolación, Monte Carlo y simulación.
- Propuesta: Usar como puente cuantitativo hacia optimización, performance e IA aplicada.
### 26. Teología I
- Tipo: no técnica.
- Ubicación propuesta: año 3, cuatrimestre 2.
- Rol: Formación teológica.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Contenidos teológicos según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 27. Teología II
- Tipo: no técnica.
- Ubicación propuesta: año 3, cuatrimestre 2.
- Rol: Formación teológica.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Contenidos teológicos según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 29. Proyecto Laboratorio II
- Tipo: técnica integradora final.
- Ubicación propuesta: año 4, cuatrimestre 1.
- Rol: Integra arquitectura, IA, producto y operación.
- Entrada esperada: Programación Asistida por IA y Arquitectura.
- Salida reusable: Producto digital complejo, arquitectura moderna, mobile/multiplataforma y despliegue asistido por IA.
- Propuesta: Capstone LDS: evaluar producto avanzado, decisiones técnicas y entrega de valor.
### 30. Calidad del Software, Testing y Performance
- Tipo: técnica.
- Ubicación propuesta: año 4, cuatrimestre 1.
- Rol: Formaliza calidad, pruebas y atributos no funcionales.
- Entrada esperada: Arquitectura.
- Salida reusable: Testing unitario/integración/regresión, carga/stress, calidad en DevOps, tests con IA.
- Propuesta: Concentrar testing formal aquí; los cursos previos sólo verifican funcionalidad mínima.
### 31. Entrepreneurship
- Tipo: producto / gestión.
- Ubicación propuesta: año 4, cuatrimestre 1.
- Rol: Traduce producto en oportunidad y salida al mercado.
- Entrada esperada: Product Development.
- Salida reusable: Emprendimiento, intrapreneurship, business plans, ecosistema y financiación.
- Propuesta: Conectar con time-to-market y propuesta de valor del capstone.
### 32. Doctrina Social
- Tipo: no técnica.
- Ubicación propuesta: año 4, cuatrimestre 2.
- Rol: Formación social.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Contenidos sociales según fuente.
- Propuesta: Fuera de alcance editorial; conservar contenidos de entrada.
### 33. Ética Profesional y Aspectos Legales
- Tipo: no técnica / legal.
- Ubicación propuesta: año 4, cuatrimestre 2.
- Rol: Ética profesional y marco legal.
- Entrada esperada: Verbatim fuente.
- Salida reusable: Confidencialidad, ética tecnológica, régimen legal de software y privacidad según fuente.
- Propuesta: Fuera de alcance editorial salvo señalar su relación con privacidad/IA sin reescribir contenidos.

## 8. TNE como trayectorias sugeridas
| Materia sugerida | Secuencia recomendada | Contenidos fuente | Salida laboral posible |
| --- | --- | --- | --- |
| Redes y Sistemas Operativos | Después de Algoritmos Avanzados o Arquitectura | SO, OSI/TCP-IP, routing, Linux procesos/memoria | DevOps, backend, soporte, SRE inicial |
| Optimización e Investigación Operativa | Después de Estadística I/II y matemática aplicada | Programación lineal, grafos, colas, heurísticas, simulación | Analítica operativa, optimización de procesos, planificación |
| Automatización y Herramientas Inteligentes | Después de Arquitectura y Programación Asistida por IA | RPA, low-code/no-code, asistentes RAG | Automatización de procesos, productividad, consultoría |
| Cómputo en la Nube y Sistemas Distribuidos | Después de Arquitectura y DevOps | Cloud, Docker/Kubernetes, procesamiento distribuido, consenso/transacciones | Cloud developer, platform engineering junior |
| Computer Vision | Después de Algoritmos Avanzados y estadística aplicada | Sin contenidos en anexo LDS | Requiere definición antes de ofrecerse; posible salida en visión aplicada |
| Administración Infraestructura y Ciberseguridad | Después de Ingeniería de Datos y Arquitectura | IaC, CIA, crypto, identidad, mitigación cloud | Seguridad aplicada, cloud ops, administración de infraestructura |
| Administración I | Sin técnica previa | Organización, misión/visión, planificación/control, CSR | Contexto organizacional para roles producto/gestión |
| Introducción a la Contabilidad | Sin técnica previa | Contabilidad, partida doble, cuentas, estados contables | Contexto financiero para producto, emprendimiento y gestión |

## 9. Proyectos integradores
- Año 1, Programación I: aplicación funcional acotada en Python, basada en problemas modelados en Análisis de Sistemas y algoritmos diseñados con Nassi-Shneiderman.
- Año 2, Proyecto Laboratorio I: producto web end-to-end desplegado, con backend, frontend, UX, gestión, persistencia, autenticación y DevOps enfocado.
- Año 3, Arquitectura e Ingeniería del Software: evaluación por casos equivalentes de software o datos, con decisiones arquitectónicas justificadas y trade-offs explícitos.
- Año 4, Proyecto Laboratorio II: producto avanzado que integra arquitectura, IA/agentes, calidad suficiente, producto y entrega de valor.

## 10. Reglas de programa según modelo
- Cada programa técnico debe incluir fundamentos, objetivos en infinitivo, unidades temáticas, metodología, evaluación, bibliografía y cronograma.
- Las prácticas deben indicar aula, laboratorio o taller.
- La regularidad debe quedar cerrada antes de la última semana según el modelo.
- La bibliografía sólo se completará con fuentes provistas o aprobadas luego; no se inventa bibliografía.

## 11. Riesgos y asuntos abiertos
- Definir si Proyecto Laboratorio I reutiliza el stack de Programación Web o permite elección.
- Precisar el límite entre verificación funcional previa y testing formal de cuarto año.
- Completar contenidos mínimos de Computer Vision antes de ofrecerla como TNE.
- Ajustar carga real por cuatrimestre al calendario institucional.
- Resolver variantes textuales de materias no técnicas cuando los documentos fuente difieren.
