import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Table, Spinner, Modal, Button, Form } from "react-bootstrap";
import "../styles/AfterSchool.css";

const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
const DAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
];

const createDefault = () => {
  const obj = {};
  DAYS.forEach((d) => {
    obj[d.key] = {};
    TIMES.forEach((t) => {
      obj[d.key][t] = { text: "", highlight: false };
    });
  });
  return obj;
};

export default function AfterSchoolAdmin() {
  const [schedule, setSchedule] = useState(createDefault());
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // {day, time, text, highlight}

  const docRef = doc(db, "afterSchool", "schedule");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (mounted) setSchedule({ ...createDefault(), ...data });
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
  }, [docRef]);

  const openEdit = (day, time) => {
    const cell = schedule[day][time] || { text: "", highlight: false };
    setEdit({ day, time, text: cell.text, highlight: cell.highlight });
  };

  const saveEdit = async () => {
    const updated = { ...schedule };
    updated[edit.day][edit.time] = {
      text: edit.text,
      highlight: edit.highlight,
    };
    setSchedule(updated);
    await setDoc(docRef, updated, { merge: true });
    setEdit(null);
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <div className="after-school">
      <Table bordered className="text-center fs-5 after-school-table">
        <thead>
          <tr>
            <th></th>
            {DAYS.map((d) => (
              <th key={d.key}>{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((t) => (
            <tr key={t}>
              <td className="time-col">{t}</td>
              {DAYS.map((d) => {
                const cell = schedule[d.key][t] || {};
                const cls = cell.highlight ? "highlight-cell" : "";
                return (
                  <td
                    key={d.key}
                    className={cls}
                    onClick={() => openEdit(d.key, t)}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      {edit && (
        <Modal show onHide={() => setEdit(null)}>
          <Modal.Header closeButton>
            <Modal.Title>내용 수정</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Control
              className="mb-2"
              placeholder="내용 입력"
              value={edit.text}
              onChange={(e) => setEdit({ ...edit, text: e.target.value })}
            />
            <Form.Check
              type="checkbox"
              label="강조하기"
              checked={edit.highlight}
              onChange={(e) => setEdit({ ...edit, highlight: e.target.checked })}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              취소
            </Button>
            <Button onClick={saveEdit}>확인</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
