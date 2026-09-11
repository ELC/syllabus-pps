import "./dac";

export default (
  <Dashboard
    name="Concept Coverage"
    description="Course-note coverage by explicit concept links"
    connection="local_duckdb"
  >
    <Row>
      <Metric
        name="Course Notes"
        description="Total note blocks found in course pages. This is the denominator for concept coverage."
        sql={include("queries/concept-coverage/course-notes.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Notes With Concepts"
        description="Course notes that link to at least one concept through a hashtag or concept page link."
        sql={include("queries/concept-coverage/notes-with-concepts.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Missing Concept Links"
        description="Course notes with no explicit concept link. These are candidates for zettelkasten cleanup."
        sql={include("queries/concept-coverage/missing-concept-links.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Coverage Percent"
        description="Share of course notes that have at least one concept link. Higher is better."
        sql={include("queries/concept-coverage/coverage-percent.sql")}
        value={{ field: "value", type: "number", format: ".1f" }}
        col={3}
      />
    </Row>

    <Row>
      <Table
        name="Coverage by Year"
        description="Aggregates notes, covered notes, and missing concept links by configured year. Read this as the yearly health of course-to-concept linking."
        sql={include("queries/concept-coverage/coverage-by-year.sql")}
        columns={[
          { name: "year", label: "Year" },
          { name: "notes", label: "Notes" },
          { name: "covered", label: "With Concept" },
          { name: "missing", label: "Missing" },
          { name: "coverage_percent", label: "Coverage %" },
        ]}
        col={12}
      />
    </Row>

    <Row>
      <Table
        name="Coverage by Course"
        description="Aggregates note coverage per course. Use this to find which courses need concept-link enrichment."
        sql={include("queries/concept-coverage/coverage-by-course.sql")}
        columns={[
          { name: "course", label: "Course" },
          { name: "notes", label: "Notes" },
          { name: "covered", label: "With Concept" },
          { name: "missing", label: "Missing" },
          { name: "coverage_percent", label: "Coverage %" },
        ]}
        col={12}
      />
    </Row>

    <Row>
      <Table
        name="Notes Missing Concept Links"
        description="Lists individual course notes without concept links. Each row points to the course and source line to edit in Logseq."
        sql={include("queries/concept-coverage/notes-missing-concept-links.sql")}
        columns={[
          { name: "course", label: "Course" },
          { name: "line", label: "Line" },
          { name: "note", label: "Note" },
        ]}
        col={12}
      />
    </Row>

    <Row>
      <Table
        name="Covered Notes"
        description="Lists notes that already have concept links. Use this to audit whether the chosen concepts are meaningful."
        sql={include("queries/concept-coverage/covered-notes.sql")}
        columns={[
          { name: "course", label: "Course" },
          { name: "line", label: "Line" },
          { name: "concept_links", label: "Concept Links" },
          { name: "note", label: "Note" },
        ]}
        col={12}
      />
    </Row>
  </Dashboard>
);
