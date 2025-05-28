import React, { useEffect, useState } from "react";
import { Table, Spinner } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/AfterSchool.css";

const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
const DAYS = ["월", "화", "수", "목", "금"];
const todayMap = ["일", "월", "화", "수", "목", "금", "토"];
const docRef = doc(db, "afterSchool", "schedule");

export default function AfterSchoolSchedule() {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists() && mounted) setSchedule(snap.data());
      } catch (e) {
        console.error("afterSchool load", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [docRef]);

  const today = todayMap[new Date().getDay()];

  if (loading) return <Spinner animation="border" />;

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
          {TIMES.map((t, ti) => (
            <tr key={t}>
              <td className="time-col">{t}</td>
              {DAYS.map((d, di) => (
                <td
                  key={d}
                  className={`${
                    d === today ? "today-col" : ""
                  } ${schedule[d]?.[ti]?.highlight ? "highlight-cell" : ""}`}
                >
                  {schedule[d]?.[ti]?.text || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
