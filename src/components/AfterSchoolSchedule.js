import React, { useEffect, useState } from "react";
import { Table, Modal, Button, Form } from "react-bootstrap";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/AfterSchool.css";

export default function AfterSchoolSchedule({ editable }) {
  const times = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
  const days = ["월", "화", "수", "목", "금"];

  const createDefault = () => {
    const obj = {};
    days.forEach((d) => {
      obj[d] = {};
      times.forEach((t) => {
        obj[d][t] = { text: "", highlight: false };
      });
    });
    return obj;
  };

  const [schedule, setSchedule] = useState(createDefault());
  const [editCell, setEditCell] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "afterSchool", "schedule"));
        if (snap.exists() && mounted) {
          setSchedule({ ...createDefault(), ...snap.data() });
        }
      } catch (e) {
        console.error("load afterSchool", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveCell = async () => {
    if (!editCell) return;
    const { day, time, text, highlight } = editCell;
    const updated = {
      ...schedule,
      [day]: { ...schedule[day], [time]: { text, highlight } },
    };
    setSchedule(updated);
    try {
      await setDoc(doc(db, "afterSchool", "schedule"), updated, { merge: true });
    } catch (e) {
      console.error("save afterSchool", e);
    }
    setEditCell(null);
  };

  const openEditor = (day, time) => {
    if (!editable) return;
    const cell = schedule[day][time];
    setEditCell({ day, time, text: cell.text, highlight: cell.highlight });
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
          {times.map((t) => (
            <tr key={t}>
              <td className="time-col">{t}</td>
              {days.map((d) => (
                <td
                  key={d}
                  className={`${d === today ? "today-col" : ""} ${
                    schedule[d][t].highlight ? "highlight" : ""
                  }`}
                  onClick={() => openEditor(d, t)}
                >
                  {schedule[d][t].text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={!!editCell} onHide={() => setEditCell(null)}>
        <Modal.Header closeButton>
          <Modal.Title>시간표 수정</Modal.Title>
        </Modal.Header>
        {editCell && (
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                {editCell.day}요일 {editCell.time}
              </Form.Label>
              <Form.Control
                value={editCell.text}
                onChange={(e) =>
                  setEditCell({ ...editCell, text: e.target.value })
                }
              />
            </Form.Group>
            <Form.Check
              type="checkbox"
              label="강조하기"
              checked={editCell.highlight}
              onChange={(e) =>
                setEditCell({ ...editCell, highlight: e.target.checked })
              }
            />
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditCell(null)}>
            취소
          </Button>
          <Button onClick={saveCell}>확인</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
