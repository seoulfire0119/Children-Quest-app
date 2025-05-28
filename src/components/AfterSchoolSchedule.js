import React, { useEffect, useState } from "react";
import { Table, Spinner } from "react-bootstrap";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../styles/AfterSchool.css";

const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
const DAYS = ["월", "화", "수", "목", "금"];

export default function AfterSchoolSchedule() {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "afterSchool", "schedule"));
        if (snap.exists()) {
          if (mounted) setSchedule(snap.data());
        }
      } catch (e) {
        console.error("afterSchool load", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Spinner animation="border" />;

  const todayMap = ["일", "월", "화", "수", "목", "금", "토"];
  const today = todayMap[new Date().getDay()];

  return (
    <div className="after-school">
      <Table bordered className="text-center fs-4 after-school-table">
        <thead>
          <tr>
            <th></th>
            {DAYS.map((d) => (
              <th key={d} className={d === today ? "today-col" : ""}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((t) => (
            <tr key={t}>
              <td className="time-col">{t}</td>
              {DAYS.map((d) => {
                const cell = schedule[d]?.[t] || {};
                const cls = cell.highlight ? "highlight-cell" : "";
                return (
                  <td key={d} className={`${d === today ? "today-col" : ""} ${cls}`}>
                    {cell.text || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
