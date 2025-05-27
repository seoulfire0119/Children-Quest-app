import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Table, Spinner } from "react-bootstrap";
import "../styles/AfterSchool.css";

const TIMES = ["1~2", "2~3", "3~4", "4~5", "6~7", "7~8"];
const DEFAULT_SCHEDULE = {
  mon: ["국어", "", "", "", "", ""],
  tue: ["수학", "", "", "", "", ""],
  wed: ["축구", "", "", "", "", ""],
  thu: ["음악", "", "", "", "", ""],
  fri: ["독서", "", "", "", "", ""],
};

export default function AfterSchoolSchedule() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "afterSchool", "schedule"));
        if (snap.exists()) {
          const data = snap.data();
          if (isMounted) setSchedule({ ...DEFAULT_SCHEDULE, ...data });
        }
      } catch (e) {
        console.error("afterSchool load", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <Spinner animation="border" />;

  const days = [
    { key: "mon", label: "월" },
    { key: "tue", label: "화" },
    { key: "wed", label: "수" },
    { key: "thu", label: "목" },
    { key: "fri", label: "금" },
  ];

  return (
    <div className="after-school">
      <Table bordered className="text-center fs-5">
        <thead>
          <tr>
            <th>요일</th>
            {TIMES.map((t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}>
              <th>{d.label}</th>
              {TIMES.map((_, idx) => (
                <td key={idx}>{schedule[d.key][idx] || ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
