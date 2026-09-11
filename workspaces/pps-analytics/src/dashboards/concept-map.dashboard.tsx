import "./dac";

const filters = require("./generated/concept-map-filters.json") as {
  source_type: string[];
};

export default (
  <Dashboard
    name="Concept Map"
    description="Concept pages, their source links, and the courses that use them"
    connection="local_duckdb"
  >
    <Row>
      <Metric
        name="Concepts"
        description="Total concept pages. This is the source vocabulary expected to carry definitions and sources."
        sql={include("queries/concept-map/concepts.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Concepts With Sources"
        description="Concepts where at least one source link was detected in the prose."
        sql={include("queries/concept-map/concepts-with-sources.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Concepts Missing Sources"
        description="Concepts with no detected source. These need better sourced descriptions in Logseq."
        sql={include("queries/concept-map/concepts-missing-sources.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Source Links"
        description="Total source rows found across concept pages. Multiple sources may belong to one concept."
        sql={include("queries/concept-map/source-links.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
    </Row>

    <Filter
      name="source_type"
      description="Filter sources by URL, documentation, bibliography, article, reference, or missing."
      type="select"
      default="All"
      options={{ values: filters.source_type }}
    />

    <Row>
      <Table
        name="Concept Sources"
        description="Read each row as concept, detected source type, source value, and source line. '(missing)' means the concept needs a source."
        sql={include("queries/concept-map/concept-sources.sql")}
        columns={[
          { name: "concept", label: "Concept" },
          { name: "source_type", label: "Source Type" },
          { name: "source", label: "Source" },
          { name: "line", label: "Line" },
        ]}
        col={12}
      />
    </Row>
  </Dashboard>
);
