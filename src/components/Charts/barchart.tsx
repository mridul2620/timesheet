import React from "react";
import { BarChart3 } from "lucide-react";
import styles from "./Charts.module.css";

type DailyHours = {
  day: string;
  abbreviation: string;
  hours: number;
};

type BarChartProps = {
  dailyHoursData: DailyHours[];
};

const BarChartComponent: React.FC<BarChartProps> = ({ dailyHoursData }) => {
  const maxHours = Math.max(...dailyHoursData.map((day) => day.hours), 10);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          <BarChart3 size={18} className={styles.chartIcon} />
          <h3>Work load report</h3>
        </div>
      </div>
      <div className={styles.barChartContainer}>
        <div className={styles.yAxis}>
          <div>{Math.round(maxHours)}h</div>
          <div>{Math.round(maxHours * 0.8)}h</div>
          <div>{Math.round(maxHours * 0.6)}h</div>
          <div>{Math.round(maxHours * 0.4)}h</div>
          <div>{Math.round(maxHours * 0.2)}h</div>
          <div>0h</div>
        </div>
        <div className={styles.barChart}>
          {dailyHoursData.map((day, index) => {
            const heightPercentage =
              day.hours > 0
                ? Math.max((day.hours / maxHours) * 100, 1)
                : 0;

            return (
              <div key={index} className={styles.barColumn}>
                <div
                  className={styles.barWrapper}
                  style={{ height: "100%" }}
                >
                  <div
                    className={styles.bar}
                    style={{
                      height: `${heightPercentage}%`,
                      backgroundColor:
                        day.hours > 0
                          ? index === 1 || index === 4
                            ? "#22d3ee"
                            : "#3b82f6"
                          : "transparent",
                    }}
                  >
                    {day.hours > 0 && (
                      <span className={styles.barValue}>{day.hours}h</span>
                    )}
                  </div>
                </div>
                <div className={styles.barLabel}>{day.abbreviation}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BarChartComponent;