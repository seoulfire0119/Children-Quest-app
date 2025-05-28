import React from "react";
import { Table } from "react-bootstrap";
import "../styles/AfterSchool.css";

export default function AfterSchoolSchedule() {
  const times = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
  const days = ["월", "화", "수", "목", "금"];
  const schedule = {
    월: { "1시": "영어학원" },
    화: { "1시": "독서" },
    수: { "1시": "태권도" },
    목: { "1시": "음악" },
    금: { "1시": "독서" },
  };

  const todayMap = ["일", "월", "화", "수", "목", "금", "토"];
  const today = todayMap[new Date().getDay()];

  return (
    <div className="after-school">
      <Table bordered className="text-center fs-4 after-school-table">
        <thead>
          <tr>
            <th></th>
            {days.map((d) => (
              <th key={d} className={d === today ? "today-col" : ""}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t, i) => (
            <tr key={t} className={`row-${i + 1}`}>
              <td className="time-col">{t}</td>
              {days.map((d) => (
                <td key={d}>{schedule[d]?.[t] || ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
