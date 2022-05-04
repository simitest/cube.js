import React from "react";
import "./App.css";
import {
  Row,
  Col,
  Card,
  Layout,
  Spin,
  Statistic,
  DatePicker,
  Radio,
  Switch,
} from "antd";
import "antd/dist/antd.css";
import cubejs from "@cubejs-client/core";
import { QueryRenderer } from "@cubejs-client/react";
import { Chart, Axis, Tooltip, Geom, Coord, Legend, Label } from "bizcharts";
import moment from "moment";
import numeral from "numeral";

const numberFormatter = item => numeral(item).format("0,0");

const dateFormatter = item => moment(item).format("MMM YY");

const colors = ["#7DB3FF", "#49457B", "#FF7C78"];

const AppLayout = ({ children }) => (
  <Layout>
    <Layout.Content
      style={{
        padding: "0 25px 25px 25px",
        margin: "25px"
      }}
    >
      {children}
    </Layout.Content>
  </Layout>
);

const Dashboard = ({ children, onPreAggChange, onDateRangeChange, onCategoryChange }) => [
  <Row
    type="flex"
    justify="space-around"
    align="top"
    gutter={24}
    style={{
      marginBottom: 20
    }}
  >
    <Col span={24} lg={12} align="left">
      <Switch
        onChange={checked => onPreAggChange(checked ? "PreAgg" : "")}
      /> Use pre-aggregations in Cube Store 
    </Col>
    <Col span={24} lg={6} align="right">
      <Radio.Group
        defaultValue="Show HN-Ask HN-Other"
        onChange={e => onCategoryChange(e.target.value)}
      >
        <Radio.Button value="Show HN-Ask HN-Other">All</Radio.Button>
        <Radio.Button value="Show HN">Show HN</Radio.Button>
        <Radio.Button value="Ask HN">Ask HN </Radio.Button>
      </Radio.Group>
    </Col>
    <Col span={24} lg={6} align="right">
      <DatePicker.RangePicker
        onChange={(date, dateString) => onDateRangeChange(dateString)}
        defaultValue={[
          moment("2013/01/01", "YYYY/MM/DD"),
          moment("2014/12/31", "YYYY/MM/DD")
        ]}
      />
    </Col>
  </Row>,
  <Row type="flex" justify="space-around" align="top" gutter={24}>
    {children}
  </Row>
];

const DashboardItem = ({ children, title, size, height }) => (
  <Col span={24} lg={size}>
    <Card
      title={title}
      style={{
        marginBottom: "24px"
      }}
    >
      <div style={{height: height}}>
        {children}
      </div>
    </Card>
  </Col>
);

DashboardItem.defaultProps = {
  size: 12
};

const stackedChartData = resultSet => {
  const data = resultSet
    .pivot()
    .map(({ xValues, yValuesArray }) =>
      yValuesArray.map(([yValues, m]) => ({
        x: resultSet.axisValuesString(xValues, ", "),
        color: resultSet.axisValuesString(yValues, ", "),
        measure: m && Number.parseFloat(m)
      }))
    )
    .reduce((a, b) => a.concat(b));
  return data;
};

const lineRender = ({ resultSet, yFormatter }) => (
  <Chart
    padding={[ 20, 30, 20, 35]}
    scale={{
      x: {
        tickCount: 8
      }
    }}
    height={300}
    data={stackedChartData(resultSet)}
    forceFit
  >
    <Axis
      name="x"
      label={{
        formatter: dateFormatter
      }}
    />
    <Axis
      label={{
        formatter: yFormatter || numberFormatter
      }}
      name="measure"
    />
    <Tooltip
      crosshairs={{
        type: "y"
      }}
    />
    <Geom
      type="line"
      position={`x*measure`}
      size={2}
      color={["color", colors]}
    />
  </Chart>
);

const cubejsApi = cubejs(process.env.REACT_APP_CUBEJS_TOKEN, {
  apiUrl: process.env.REACT_APP_API_URL
});

const renderChart = (Component, options = {}) => ({ resultSet, error }) =>
  (resultSet && <Component resultSet={resultSet} {...options} />) ||
  (error && error.toString()) || <div style={{ textAlign: "center", paddingTop: 30 }}><Spin /> </div>;

const barRender = ({ resultSet , yFormatter }) => (
  <Chart
    padding={[ 20, 30, 20, 40]}
    scale={{
      x: {
        tickCount: 8
      }
    }}
    height={300}
    data={stackedChartData(resultSet)}
    forceFit
  >
    <Axis
      name="x"
    />
    <Axis
      label={{
        formatter: (item) => numeral(item).format("0a")
      }}
      name="measure"
    />
    <Tooltip />
    <Geom type="intervalStack" position={`x*measure`} color="color" />
  </Chart>
);

const numberRender = ({ resultSet }) => (
  <Row
    type="flex"
    justify="center"
    align="middle"
    style={{
      height: "100%"
    }}
  >
    <Col>
      {resultSet.seriesNames().map(s => (
        <Statistic value={resultSet.totalRow()[s.key]} />
      ))}
    </Col>
  </Row>
);

const pieRender = ({ resultSet }) => (
  <Chart
    height={300}
    padding={[ 20, 30, 50, 30]}
    data={resultSet.chartPivot()} forceFit>
    <Coord type="theta" radius={0.75} />
    {resultSet.seriesNames().map(s => (
      <Axis name={s.key} />
    ))}
    <Legend position="bottom" />
    <Tooltip />
    {resultSet.seriesNames().map(s => (
      <Geom type="intervalStack" position={s.key} color="category">
        <Label content={s.key} formatter={numberFormatter} />
      </Geom>
    ))}
  </Chart>
);

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cubePostFix: "",
      dateRange: ["2013-01-01", "2014-12-31"],
      averageScoreGranularity: 'week',
      categories: ["Show HN", "Ask HN", "Other"]
    };
  }

  render() {
    return (
      <div className="App">
        <AppLayout>
          <Dashboard
            onPreAggChange={value =>
              this.setState({
                cubePostFix: value
              })
            }
            onDateRangeChange={dateRange =>
              this.setState({
                dateRange: dateRange
              })
            }
            onCategoryChange={value =>
              this.setState({
                categories: value.split("-")
              })
            }
          >
            <DashboardItem title="Total Stories" size={8} height={80}>
              <QueryRenderer
                query={{
                  measures: [`Stories${this.state.cubePostFix}.count`],
                  timeDimensions: [
                    {
                      dimension: `Stories${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange
                    }
                  ],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(numberRender)}
              />
            </DashboardItem>
            <DashboardItem title="Total Comments" size={8} height={80}>
              <QueryRenderer
                query={{
                  measures: [`Comments${this.state.cubePostFix}.count`],
                  timeDimensions: [
                    {
                      dimension: `Comments${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange
                    }
                  ],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(numberRender)}
              />
            </DashboardItem>
            <DashboardItem title="Total Stories Authors" size={8} height={84}>
              <QueryRenderer
                query={{
                  measures: [`Stories${this.state.cubePostFix}.authorsCount`],
                  timeDimensions: [
                    {
                      dimension: `Stories${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange
                    }
                  ],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(numberRender)}
              />
            </DashboardItem>
            <DashboardItem
              height={300}
              title={[
                "Story Average Score",
                <Radio.Group
                    defaultValue="week"
                    onChange={(e) => this.setState({ averageScoreGranularity: e.target.value })}
                    style={{ float: "right" }}
                >
                  <Radio.Button value="week">Weekly</Radio.Button>
                  <Radio.Button value="day">Daily</Radio.Button>
                </Radio.Group>
              ]}
              size={16}
            >
              <QueryRenderer
                query={{
                  measures: [`Stories${this.state.cubePostFix}.averageScore`],
                  dimensions: [`Stories${this.state.cubePostFix}.category`],
                  timeDimensions: [
                    {
                      dimension: `Stories${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange,
                      granularity: this.state.averageScoreGranularity
                    }
                  ],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(lineRender)}
              />
            </DashboardItem>
            <DashboardItem size={8} title="Portion of Dead Stories">
              <QueryRenderer
                query={{
                  measures: [`Stories${this.state.cubePostFix}.count`],
                  timeDimensions: [
                    {
                      dimension: `Stories${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange,
                    }
                  ],
                  dimensions: [`Stories${this.state.cubePostFix}.dead`],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(pieRender)}
              />
            </DashboardItem>
            <DashboardItem title="Percentage of Stories with 500+ Scores">
              <QueryRenderer
                query={{
                  measures: [`Stories${this.state.cubePostFix}.percentageOfHighRanked`],
                  timeDimensions: [
                    {
                      dimension: `Stories${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange,
                      granularity: "month"
                    }
                  ],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(lineRender, { yFormatter: (item) => numeral(item).format('0.0[0000]')})}
              />
            </DashboardItem>
            <DashboardItem title="Distribution of Scores in Tiers">
              <QueryRenderer
                query={{
                  measures: [`Stories${this.state.cubePostFix}.count`],
                  timeDimensions: [
                    {
                      dimension: `Stories${this.state.cubePostFix}.time`,
                      dateRange: this.state.dateRange,
                    }
                  ],
                  dimensions: [`Stories${this.state.cubePostFix}.scoreTier`],
                  filters: [
                    {
                      member: `Stories${this.state.cubePostFix}.scoreTier`,
                      operator: `notEquals`,
                      values: [`Unknown`]
                    },
                    {
                      member: `Stories${this.state.cubePostFix}.category`,
                      operator: `equals`,
                      values: this.state.categories
                    }
                  ]
                }}
                cubejsApi={cubejsApi}
                render={renderChart(barRender)}
              />
            </DashboardItem>
          </Dashboard>
        </AppLayout>
      </div>
    );
  }
}

export default App;
