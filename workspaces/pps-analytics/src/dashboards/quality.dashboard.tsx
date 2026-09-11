import "./dac";

const filters = require("./generated/quality-filters.json") as {
  severity: string[];
  code: string[];
  page: string[];
};

export default (
  <Dashboard
    name="Quality"
    description="Structural and curricular diagnostics generated from the Logseq PPS mirror"
    connection="local_duckdb"
  >
    <Row>
      <Metric
        name="Pages"
        description="Total parsed Logseq pages. Use this as a quick check that the mirror is being read."
        sql={include("queries/quality/pages.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Edges"
        description="Total explicit links and hashtags. Higher values indicate a denser zettelkasten graph."
        sql={include("queries/quality/edges.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Expected Courses"
        description="Courses declared in pps.config.ts. Compare this with course pages and diagnostics."
        sql={include("queries/quality/expected-courses.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Red Diagnostics"
        description="Errors that should block confidence in the current graph. Read the Diagnostics table for details."
        sql={include("queries/quality/errors.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
    </Row>

    <Row>
      <Metric
        name="Warnings"
        description="Non-blocking issues that still deserve review. Filter the table below by code or page."
        sql={include("queries/quality/warnings.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Concept Pages"
        description="Pages classified as concepts. These should contain source links and connect course content."
        sql={include("queries/quality/concept-pages.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Course Pages"
        description="Pages classified as courses. These are expected to link forward into concept pages."
        sql={include("queries/quality/course-pages.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Year Pages"
        description="Pages classified as curriculum years. These should reference their expected courses."
        sql={include("queries/quality/year-pages.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
    </Row>

    <Filter
      name="severity"
      description="Limit diagnostics to errors, warnings, or all severities."
      type="select"
      default="All"
      options={{ values: filters.severity }}
    />
    <Filter
      name="code"
      description="Focus on one diagnostic rule, such as missing sources or course pages without concepts."
      type="select"
      default="All"
      options={{ values: filters.code }}
    />
    <Filter
      name="page"
      description="Inspect diagnostics affecting one page."
      type="select"
      default="All"
      options={{ values: filters.page }}
    />

    <Row>
      <Table
        name="Diagnostics"
        description="Each row is one generated quality finding. Use severity, code, page, and line to decide what to fix in Logseq."
        sql={include("queries/quality/diagnostics.sql")}
        columns={[
          { name: "severity", label: "Severity" },
          { name: "code", label: "Code" },
          { name: "page", label: "Page" },
          { name: "line", label: "Line" },
          { name: "message", label: "Message" },
        ]}
        col={12}
      />
    </Row>
  </Dashboard>
);
