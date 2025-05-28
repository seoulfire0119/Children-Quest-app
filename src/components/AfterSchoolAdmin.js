import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Table, Spinner } from "react-bootstrap";
import "../styles/AfterSchool.css";

const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];

const createDefault = () => ({
  mon: TIMES.map(() => ({ text: "", highlight: false })),
  tue: TIMES.map(() => ({ text: "", highlight: false })),
  wed: TIMES.map(() => ({ text: "", highlight: false })),
  thu: TIMES.map(() => ({ text: "", highlight: false })),
  fri: TIMES.map(() => ({ text: "", highlight: false })),
});

const docRef = doc(db, "afterSchool", "schedule");

export default function AfterSchoolAdmin() {
  const [schedule, setSchedule] = useState(createDefault());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (isMounted) setSchedule({ ...createDefault(), ...data });
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
  }, [docRef]);

  if (loading) return <Spinner animation="border" />;

  const days = [
    { key: "mon", label: "월" },
    { key: "tue", label: "화" },
    { key: "wed", label: "수" },
    { key: "thu", label: "목" },
    { key: "fri", label: "금" },
  ];

  const editCell = async (dayKey, idx) => {
    const current = schedule[dayKey][idx] || { text: "", highlight: false };
    const text = window.prompt("내용을 입력하세요", current.text);
    if (text === null) return;
    const highlight = window.confirm("강조하시겠습니까?");
    const updated = { ...schedule };
    updated[dayKey] = [...updated[dayKey]];
    updated[dayKey][idx] = { text, highlight };
    setSchedule(updated);
    await setDoc(docRef, updated, { merge: true });
  };

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
                <td
                  key={idx}
                  onClick={() => editCell(d.key, idx)}
                  className={
                    schedule[d.key][idx]?.highlight ? "highlight-cell" : ""
                  }
                >
                  {schedule[d.key][idx]?.text || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
