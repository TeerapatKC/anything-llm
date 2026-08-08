import { v4 } from "uuid";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Legend as RechartsLegend,
  Funnel,
  FunnelChart,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { Colors, getTremorColor } from "./chart-utils.js";
import CustomCell from "./CustomCell.jsx";
import Tooltip from "./CustomTooltip.jsx";
import { safeJsonParse } from "@/utils/request.js";
import renderMarkdown from "@/utils/chat/markdown.js";
import DOMPurify from "dompurify";
import { memo, useCallback, useState } from "react";
import { saveAs } from "file-saver";
import { useGenerateImage } from "recharts-to-png";
import { CircleNotch, DownloadSimple } from "@phosphor-icons/react";

/** Slice colours for the donut, in the order tremor used them. */
const DONUT_COLORS = [
  "cyan",
  "violet",
  "rose",
  "amber",
  "emerald",
  "teal",
  "fuchsia",
];

/** Replaces tremor's <Legend>: one swatch and the series name. */
function ChartLegend({ label, color, className = "" }) {
  return (
    <div
      className={`flex items-center gap-x-2 text-xs text-white ${className}`}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}

const dataFormatter = (number) => {
  return Intl.NumberFormat("us").format(number).toString();
};

export function Chartable({ props }) {
  const [getDivJpeg, { ref }] = useGenerateImage({
    quality: 1,
    type: "image/jpeg",
    options: {
      backgroundColor: "#393d43",
      padding: 20,
    },
  });
  const handleDownload = useCallback(async () => {
    const jpeg = await getDivJpeg();
    if (jpeg) saveAs(jpeg, `chart-${v4().split("-")[0]}.jpg`);
  }, []);

  const color = null;
  const showLegend = true;
  const content =
    typeof props.content === "string"
      ? safeJsonParse(props.content, null)
      : props.content;
  if (content === null) return null;

  const chartType = content?.type?.toLowerCase();
  const data =
    typeof content.dataset === "string"
      ? safeJsonParse(content.dataset, [])
      : content.dataset;
  const value = data.length > 0 ? Object.keys(data[0])[1] : "value";
  const title = content?.title;

  const renderChart = () => {
    switch (chartType) {
      case "area":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{ transform: "translate(0, 6)", fill: "white" }}
                  style={{ fontSize: "12px", fontFamily: "Inter; Helvetica" }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  type="number"
                  tickFormatter={dataFormatter}
                  tick={{ transform: "translate(-3, 0)", fill: "white" }}
                  style={{ fontSize: "12px", fontFamily: "Inter; Helvetica" }}
                />
                <Tooltip legendColor={getTremorColor(color || "blue")} />
                {showLegend && <RechartsLegend />}
                <Area
                  type="linear"
                  dataKey={value}
                  stroke={getTremorColor(color || "blue")}
                  fill={getTremorColor(color || "blue")}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case "bar":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={dataFormatter}
                  tick={{ fill: "white" }}
                  style={{ fontSize: "12px", fontFamily: "Inter; Helvetica" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "white" }}
                  style={{ fontSize: "12px", fontFamily: "Inter; Helvetica" }}
                />
                <Tooltip legendColor={getTremorColor(color || "blue")} />
                {showLegend && <RechartsLegend />}
                <Bar dataKey={value} fill={getTremorColor(color || "blue")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case "line":
        return (
          <div className="bg-theme-bg-primary p-8 pb-12 rounded-xl text-white h-[500px] w-full light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{ transform: "translate(0, 6)", fill: "white" }}
                  style={{ fontSize: "12px", fontFamily: "Inter; Helvetica" }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  type="number"
                  tickFormatter={dataFormatter}
                  tick={{ transform: "translate(-3, 0)", fill: "white" }}
                  style={{ fontSize: "12px", fontFamily: "Inter; Helvetica" }}
                />
                <Tooltip legendColor={getTremorColor(color || "blue")} />
                {showLegend && <RechartsLegend />}
                <Line
                  type="linear"
                  dataKey={value}
                  stroke={getTremorColor(color || "blue")}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      case "composed":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            {showLegend && (
              <ChartLegend
                label={value}
                color={getTremorColor(color || "blue")}
                className="mb-5 justify-end"
              />
            )}
            <ComposedChart width={500} height={260} data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ transform: "translate(0, 6)", fill: "white" }}
                style={{
                  fontSize: "12px",
                  fontFamily: "Inter; Helvetica",
                }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                type="number"
                tick={{ transform: "translate(-3, 0)", fill: "white" }}
                style={{
                  fontSize: "12px",
                  fontFamily: "Inter; Helvetica",
                }}
              />
              <Tooltip legendColor={getTremorColor(color || "blue")} />
              <Line
                type="linear"
                dataKey={value}
                stroke={getTremorColor(color || "blue")}
                dot={false}
                strokeWidth={2}
              />
              <Bar
                dataKey="value"
                name="value"
                type="linear"
                fill={getTremorColor(color || "blue")}
              />
            </ComposedChart>
          </div>
        );
      case "scatter":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            {showLegend && (
              <div className="flex justify-end">
                <ChartLegend
                  label={value}
                  color={getTremorColor(color || "blue")}
                  className="mb-5"
                />
              </div>
            )}
            <ScatterChart width={500} height={260} data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ transform: "translate(0, 6)", fill: "white" }}
                style={{
                  fontSize: "12px",
                  fontFamily: "Inter; Helvetica",
                }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                type="number"
                tick={{ transform: "translate(-3, 0)", fill: "white" }}
                style={{
                  fontSize: "12px",
                  fontFamily: "Inter; Helvetica",
                }}
              />
              <Tooltip legendColor={getTremorColor(color || "blue")} />
              <Scatter dataKey={value} fill={getTremorColor(color || "blue")} />
            </ScatterChart>
          </div>
        );
      case "pie":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey={value}
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={getTremorColor(
                        DONUT_COLORS[index % DONUT_COLORS.length]
                      )}
                    />
                  ))}
                </Pie>
                <Tooltip legendColor={getTremorColor(color || "cyan")} />
                {showLegend && <RechartsLegend />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      case "radar":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            {showLegend && (
              <div className="flex justify-end">
                <ChartLegend
                  label={value}
                  color={getTremorColor(color || "blue")}
                  className="mb-5"
                />
              </div>
            )}
            <RadarChart
              cx={300}
              cy={250}
              outerRadius={150}
              width={600}
              height={500}
              data={data}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fill: "white" }} />
              <PolarRadiusAxis tick={{ fill: "white" }} />
              <Tooltip legendColor={getTremorColor(color || "blue")} />
              <Radar
                dataKey="value"
                stroke={getTremorColor(color || "blue")}
                fill={getTremorColor(color || "blue")}
                fillOpacity={0.6}
              />
            </RadarChart>
          </div>
        );
      case "radialbar":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            {showLegend && (
              <div className="flex justify-end">
                <ChartLegend
                  label={value}
                  color={getTremorColor(color || "blue")}
                  className="mb-5"
                />
              </div>
            )}
            <RadialBarChart
              width={500}
              height={300}
              cx={150}
              cy={150}
              innerRadius={20}
              outerRadius={140}
              barSize={10}
              data={data}
            >
              <RadialBar
                angleAxisId={15}
                label={{
                  position: "insideStart",
                  fill: getTremorColor(color || "blue"),
                }}
                dataKey="value"
              />
              <Tooltip legendColor={getTremorColor(color || "blue")} />
            </RadialBarChart>
          </div>
        );
      case "treemap":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            {showLegend && (
              <div className="flex justify-end">
                <ChartLegend
                  label={value}
                  color={getTremorColor(color || "blue")}
                  className="mb-5"
                />
              </div>
            )}
            <Treemap
              width={500}
              height={260}
              data={data}
              dataKey="value"
              stroke="#fff"
              fill={getTremorColor(color || "blue")}
              content={<CustomCell colors={Object.values(Colors)} />}
            >
              <Tooltip legendColor={getTremorColor(color || "blue")} />
            </Treemap>
          </div>
        );
      case "funnel":
        return (
          <div className="bg-theme-bg-primary p-8 rounded-xl text-white light:border light:border-theme-border-primary">
            <h3 className="text-lg text-theme-text-primary font-medium">
              {title}
            </h3>
            {showLegend && (
              <div className="flex justify-end">
                <ChartLegend
                  label={value}
                  color={getTremorColor(color || "blue")}
                  className="mb-5"
                />
              </div>
            )}
            <FunnelChart width={500} height={300} data={data}>
              <Tooltip legendColor={getTremorColor(color || "blue")} />
              <Funnel dataKey="value" color={getTremorColor(color || "blue")} />
            </FunnelChart>
          </div>
        );
      default:
        return <p>Unsupported chart type.</p>;
    }
  };

  if (!!props.chatId) {
    return (
      <div className="flex justify-start w-full">
        <div className="py-2 px-4 w-full flex flex-col md:max-w-[80%]">
          <div className="relative w-full">
            <DownloadGraph onClick={handleDownload} />
            <div ref={ref}>{renderChart()}</div>
            <span
              className="flex flex-col gap-y-1 mt-2"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(renderMarkdown(content.caption)),
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start w-full">
      <div className="py-2 px-4 w-full flex flex-col md:max-w-[80%]">
        <div className="relative w-full">
          <DownloadGraph onClick={handleDownload} />
          <div ref={ref}>{renderChart()}</div>
        </div>
        <span
          className="flex flex-col gap-y-1 mt-2"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(content.caption)),
          }}
        />
      </div>
    </div>
  );
}

function DownloadGraph({ onClick }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    await onClick?.();
    setLoading(false);
  };

  return (
    <div className="absolute top-3 right-3 z-50 cursor-pointer">
      <div className="flex flex-col items-center">
        <div className="p-1 rounded-full border-none">
          {loading ? (
            <CircleNotch
              className="text-theme-text-primary w-5 h-5 animate-spin"
              aria-label="Downloading image..."
            />
          ) : (
            <DownloadSimple
              weight="bold"
              className="text-theme-text-primary w-5 h-5 hover:text-theme-text-primary"
              onClick={handleClick}
              aria-label="Download graph image"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Chartable);
