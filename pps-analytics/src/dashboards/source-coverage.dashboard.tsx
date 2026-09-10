import "./dac";

export default (
  <Dashboard
    name="Source Coverage"
    description="Source-link coverage for concept notes reached from course pages"
    connection="local_duckdb"
  >
    <Row>
      <Metric
        name="Linked Concept Notes"
        description="Distinct concept note blocks reachable from all course-linked concepts."
        sql={include("queries/source-coverage/linked-concept-notes.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Notes With Sources"
        description="Reachable concept notes that include at least one detected source link."
        sql={include("queries/source-coverage/notes-with-sources.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Missing Source Links"
        description="Reachable concept notes without a detected source link."
        sql={include("queries/source-coverage/missing-source-links.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Source Coverage Percent"
        description="Share of reachable concept notes that have source links. Higher is better."
        sql={include("queries/source-coverage/source-coverage-percent.sql")}
        value={{ field: "value", type: "number", format: ".1f" }}
        col={3}
      />
    </Row>

    <Row>
      <Table
        name="Source Coverage by Year"
        description="For each year, this counts unique concept note blocks linked by that year's courses and how many have sources."
        sql={include("queries/source-coverage/source-coverage-by-year.sql")}
        columns={[
          { name: "year", label: "Year" },
          { name: "concept_notes", label: "Concept Notes" },
          { name: "sourced", label: "With Source" },
          { name: "missing", label: "Missing Source" },
          { name: "coverage_percent", label: "Coverage %" },
        ]}
        col={12}
      />
    </Row>

    <Row>
      <Table
        name="Source Coverage by Course"
        description="For each course, this answers how many note blocks from its linked concepts have source links."
        sql={include("queries/source-coverage/source-coverage-by-course.sql")}
        columns={[
          { name: "year", label: "Year" },
          { name: "course", label: "Course" },
          { name: "concept_notes", label: "Concept Notes" },
          { name: "sourced", label: "With Source" },
          { name: "missing", label: "Missing Source" },
          { name: "coverage_percent", label: "Coverage %" },
        ]}
        col={12}
      />
    </Row>

    <Row>
      <Table
        name="Concept Note Sources"
        description="Each row is one concept note reached from a course. 'yes' means that note has a source link; 'no' means the note needs sourcing."
        sql={include("queries/source-coverage/concept-note-sources.sql")}
        columns={[
          { name: "year", label: "Year" },
          { name: "course", label: "Course" },
          { name: "concept", label: "Concept" },
          { name: "line", label: "Line" },
          { name: "has_source", label: "Has Source" },
          { name: "source_links", label: "Source Links" },
          { name: "note", label: "Note" },
        ]}
        col={12}
      />
    </Row>
  </Dashboard>
);
