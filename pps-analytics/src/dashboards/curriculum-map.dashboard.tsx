import "./dac";

const filters = require("./generated/curriculum-map-filters.json") as {
  year: string[];
  course: string[];
  concept: string[];
};

export default (
  <Dashboard
    name="Curriculum Map"
    description="Expected years, expected courses, and parsed curriculum pages"
    connection="local_duckdb"
  >
    <Row>
      <Metric
        name="Expected Years"
        description="Number of curriculum years configured for validation."
        sql={include("queries/curriculum-map/expected-years.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Expected Courses"
        description="Number of configured courses across all years."
        sql={include("queries/curriculum-map/expected-courses.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="Unique Linked Concepts"
        description="Distinct concepts linked from all course pages. This is the curriculum's explicit concept vocabulary."
        sql={include("queries/curriculum-map/linked-concepts.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
      <Metric
        name="All Pages"
        description="Total parsed pages in the mirror, including years, courses, concepts, and other page kinds."
        sql={include("queries/curriculum-map/all-pages.sql")}
        value={{ field: "value", type: "number", format: ",.0f" }}
        col={3}
      />
    </Row>

    <Filter
      name="year"
      description="Show rows for one configured curriculum year."
      type="select"
      default="All"
      options={{ values: filters.year }}
    />
    <Filter
      name="course"
      description="Show concept rows for one course."
      type="select"
      default="All"
      options={{ values: filters.course }}
    />
    <Filter
      name="concept"
      description="Show where a specific concept appears across courses."
      type="select"
      default="All"
      options={{ values: filters.concept }}
    />

    <Row>
      <Table
        name="Expected Curriculum"
        description="Read one row as year, course, and concept. A '(no concept links)' value means the course page has no explicit concept links."
        sql={include("queries/curriculum-map/expected-curriculum.sql")}
        columns={[
          { name: "year", label: "Year" },
          { name: "course", label: "Course" },
          { name: "concept", label: "Concept" },
        ]}
        col={12}
      />
    </Row>
  </Dashboard>
);
