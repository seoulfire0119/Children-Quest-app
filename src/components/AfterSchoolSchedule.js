import React, { useEffect, useState } from "react";
import { Table, Modal, Button, Form } from "react-bootstrap";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/AfterSchool.css";

const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const createDefaultSchedule = () => {
  const obj = {};
  DAYS.forEach((d) => {
    obj[d] = {};
    TIMES.forEach((t) => {
      obj[d][t] = { text: "", highlight: false };
    });
  });
  return obj;
};

const getTodayIndex = () => {
  const dayIndex = new Date().getDay();
  return dayIndex === 0 ? 6 : dayIndex - 1;
};

export default function AfterSchoolSchedule({ editable }) {
  const todayIndex = getTodayIndex();
  const today = DAYS[todayIndex];

  const [schedule, setSchedule] = useState(createDefaultSchedule());
  const [editCell, setEditCell] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDayIdx, setCurrentDayIdx] = useState(todayIndex);

  // 첫 번째 useEffect - 스케줄 로드
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const scheduleDocRef = doc(db, "afterSchool", "schedule");
        const snap = await getDoc(scheduleDocRef);
        if (mounted) {
          setSchedule(
            snap.exists()
              ? { ...createDefaultSchedule(), ...snap.data() }
              : createDefaultSchedule()
          );
        }
      } catch (e) {
        console.error(e);
        if (mounted) setSchedule(createDefaultSchedule());
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 두 번째 useEffect - 키보드 이벤트 리스너
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft")
        setCurrentDayIdx((i) => (i - 1 + DAYS.length) % DAYS.length);
      if (e.key === "ArrowRight")
        setCurrentDayIdx((i) => (i + 1) % DAYS.length);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const saveCell = async () => {
    if (!editCell) return;

    const updatedSchedule = {
      ...schedule,
      [editCell.day]: {
        ...schedule[editCell.day],
        [editCell.time]: { text: editCell.text, highlight: editCell.highlight },
      },
    };

    setSchedule(updatedSchedule);

    try {
      await setDoc(doc(db, "afterSchool", "schedule"), updatedSchedule, {
        merge: true,
      });
    } catch (e) {
      console.error(e);
    }

    setEditCell(null);
  };

  const openEditor = (day, time) => {
    if (!editable) return;
    const currentCellData = schedule[day]?.[time] || {
      text: "",
      highlight: false,
    };
    setEditCell({ day, time, ...currentCellData });
  };

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "200px" }}
      >
        <div>Loading schedule...</div>
      </div>
    );
  }

  const headerDate = new Date().toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    weekday: "long",
  });
  const currentDay = DAYS[currentDayIdx];

  return (
    <div className="after-school p-3">
      <h2 className="text-center mb-2">
        방과후 시간표 <div></div>({headerDate})
      </h2>
      <div className="day-selector mb-3 text-center">
        {DAYS.map((d, idx) => (
          <Button
            key={d}
            className={`day-btn ${idx === currentDayIdx ? "active" : ""} ${
              d === today ? "today" : ""
            }`}
            onClick={() => setCurrentDayIdx(idx)}
            variant="light"
          >
            {d}
          </Button>
        ))}
      </div>
      <Table bordered className="text-center fs-5 after-school-table shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: "30%" }}>시간</th>
            <th style={{ width: "70%" }}>{currentDay}</th>
          </tr>
        </thead>
        <tbody>
          {TIMES.map((t) => {
            const cellData = schedule[currentDay]?.[t];
            return (
              <tr key={t}>
                <td>{t}</td>
                <td
                  className={`${cellData.highlight ? "highlight" : ""} ${
                    editable ? "editable-cell" : ""
                  }`}
                  onClick={() => openEditor(currentDay, t)}
                >
                  {cellData.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* 편집 모달 (필요한 경우) */}
      {editCell && (
        <Modal show={!!editCell} onHide={() => setEditCell(null)}>
          <Modal.Header closeButton>
            <Modal.Title>일정 편집</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>내용</Form.Label>
                <Form.Control
                  type="text"
                  value={editCell.text}
                  onChange={(e) =>
                    setEditCell({ ...editCell, text: e.target.value })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="강조 표시"
                  checked={editCell.highlight}
                  onChange={(e) =>
                    setEditCell({ ...editCell, highlight: e.target.checked })
                  }
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditCell(null)}>
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
