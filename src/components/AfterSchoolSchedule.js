import React, { useEffect, useState } from "react";
import { Table, Spinner, Modal, Button, Form } from "react-bootstrap";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/AfterSchool.css";

/* ───────────────────────────────────────────
   CONSTANTS
   ─────────────────────────────────────────── */
const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
const DAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
];
const TODAY_KOR = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];

/* ───────────────────────────────────────────
   HELPERS
   ─────────────────────────────────────────── */
const createDefaultSchedule = () => {
  const base = {};
  DAYS.forEach((d) => {
    base[d.label] = {};
    TIMES.forEach((t) => {
      base[d.label][t] = { text: "", highlight: false };
    });
  });
  return base;
};

/* ───────────────────────────────────────────
   COMPONENT
   ─────────────────────────────────────────── */
export default function AfterSchoolSchedule({ editable = false }) {
  /* ── state ─────────────────────────────── */
  const [schedule, setSchedule] = useState(createDefaultSchedule());
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState(null); // { day, time, text, highlight }

  /* ── firestore ref ─────────────────────── */
  const docRef = doc(db, "afterSchool", "schedule");

  /* ── fetch on mount ─────────────────────── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists() && mounted) {
          setSchedule({ ...createDefaultSchedule(), ...snap.data() });
        }
      } catch (err) {
        console.error("afterSchool load", err);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [docRef]);

  /* ── handlers ──────────────────────────── */
  const openEditor = (dayLabel, time) => {
    if (!editable) return;
    const cell = schedule[dayLabel]?.[time] || { text: "", highlight: false };
    setEditCell({ dayLabel, time, text: cell.text, highlight: cell.highlight });
  };

  const saveCell = async () => {
    if (!editCell) return;
    const { dayLabel, time, text, highlight } = editCell;
    const updated = {
      ...schedule,
      [dayLabel]: {
        ...schedule[dayLabel],
        [time]: { text, highlight },
      },
    };
    setSchedule(updated);
    try {
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.error("afterSchool save", err);
    }
    setEditCell(null);
  };

  /* ── render ────────────────────────────── */
  if (loading) return <Spinner animation="border" />;

  return (
    <div className="after-school p-3">
      <h2 className="text-center mb-4">방과 후 활동 시간표</h2>
      <Table bordered className="text-center fs-5 after-school-table shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: "10%" }}>시간</th>
            {DAYS.map(({ label }) => (
              <th
                key={label}
                className={label === TODAY_KOR ? "today-col table-info" : ""}
                style={{ width: "18%" }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((t) => (
            <tr key={t}>
              <td className="time-col align-middle">{t}</td>
              {DAYS.map(({ label }) => {
                const cell = schedule[label]?.[t] || { text: "", highlight: false };
                const cls = [
                  label === TODAY_KOR ? "today-col" : "",
                  cell.highlight ? "highlight-cell" : "",
                  editable ? "editable-cell" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <td
                    key={`${label}-${t}`}
                    className={cls}
                    onClick={() => openEditor(label, t)}
                    style={{ cursor: editable ? "pointer" : "default" }}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ── edit modal ─────────────────────── */}
      {editable && editCell && (
        <Modal show onHide={() => setEditCell(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>시간표 항목 수정</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                {editCell.dayLabel}요일 {editCell.time}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editCell.text}
                onChange={(e) => setEditCell({ ...editCell, text: e.target.value })}
                placeholder="활동 내용을 입력하세요"
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="highlight-switch"
              label="이 항목 강조하기"
              checked={editCell.highlight}
              onChange={(e) => setEditCell({ ...editCell, highlight: e.target.checked })}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setEditCell(null)}>
              취소
            </Button>
            <Button variant="primary" onClick={saveCell}>
              저장
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
