import React, { useState } from "react";
import { PieChart } from "lucide-react";
import styles from "./charts.module.css";

type ProjectHours = {
  project: string;
  hours: number;
  color: string;
};

type PieChartProps = {
  projectHoursData: ProjectHours[];
  formatHoursAndMinutes: (hours: number) => string;
};

const PieChartComponent: React.FC<PieChartProps> = ({
  projectHoursData,
  formatHoursAndMinutes,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const totalHours = projectHoursData.reduce(
    (sum, project) => sum + project.hours,
    0
  );
  const projectCount = projectHoursData.length;

  let cumulativePercentage = 0;
  const segments = projectHoursData.map((project, index) => {
    const percentage = (project.hours / totalHours) * 100;
    const startAngle = cumulativePercentage;
    cumulativePercentage += percentage;
    const endAngle = cumulativePercentage;
    const startX =
      50 + 40 * Math.cos((startAngle / 100) * 2 * Math.PI - Math.PI / 2);
    const startY =
      50 + 40 * Math.sin((startAngle / 100) * 2 * Math.PI - Math.PI / 2);
    const endX =
      50 + 40 * Math.cos((endAngle / 100) * 2 * Math.PI - Math.PI / 2);
    const endY =
      50 + 40 * Math.sin((endAngle / 100) * 2 * Math.PI - Math.PI / 2);
    const largeArcFlag = percentage > 50 ? 1 : 0;
    const path = `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

    return { project, percentage, path };
  });

  const getTooltipPosition = (index: number) => {
    if (index === null) return { left: 0, top: 0 };
    const segment = segments[index];
    const startPercentage =
      index === 0
        ? 0
        : segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0);
    const midPercentage = startPercentage + segment.percentage / 2;
    const midAngle = (midPercentage / 100) * 2 * Math.PI - Math.PI / 2;
    const tooltipX = 50 + 50 * Math.cos(midAngle);
    const tooltipY = 50 + 50 * Math.sin(midAngle);

    return { left: `${tooltipX}%`, top: `${tooltipY}%` };
  };

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          <PieChart size={18} className={styles.chartIcon} />
          <h3>Projects handled</h3>
        </div>
      </div>
      <div className={styles.pieChartContainer}>
        <div className={styles.pieChart}>
          <svg viewBox="0 0 100 100" className={styles.pieChartSvg}>
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.path}
                fill={segment.project.color}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
                className={styles.pieSegment}
              />
            ))}
            <circle cx="50" cy="50" r="25" fill="#121f3a" />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="36"
              fontWeight="bold"
            >
              {projectCount}
            </text>
          </svg>

          {hoveredSegment !== null && (
            <div
              className={styles.segmentTooltip}
              style={getTooltipPosition(hoveredSegment)}
            >
              {projectHoursData[hoveredSegment].project}
            </div>
          )}
        </div>
        <div className={styles.pieChartLegend}>
          {projectHoursData.map((project, index) => (
            <div
              key={index}
              className={styles.legendItem}
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div
                className={styles.legendColor}
                style={{ backgroundColor: project.color }}
              ></div>
              <div className={styles.legendText}>
                <div className={styles.legendTitle}>{project.project}</div>
                <div className={styles.legendValue}>
                  {formatHoursAndMinutes(project.hours)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChartComponent;