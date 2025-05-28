import React, { useEffect, useState } from "react";
import { Table, Modal, Button, Form, Spinner } from "react-bootstrap";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/AfterSchool.css";

export default function AfterSchoolSchedule({ editable = false }) {
  const times = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
  const days = ["월", "화", "수", "목", "금"];

  // 초기 상태를 null로 설정하여 로딩 상태와 구분
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({ show: false, day: "", time: "", text: "", highlight: false });

  // 데이터 로드
  useEffect(() => {
    // 기본 구조 생성 함수를 useEffect 내부로 이동
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

    let isMounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "afterSchool", "schedule"));
        if (snap.exists()) {
          const data = snap.data();
          if (isMounted) setSchedule({ ...createDefault(), ...data });
        } else {
          // 문서가 존재하지 않을 경우 기본값 설정
          if (isMounted) setSchedule(createDefault());
        }
      } catch (e) {
        console.error("load afterSchool schedule", e);
        // 에러 발생 시에도 기본값 설정
        if (isMounted) setSchedule(createDefault());
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []); // 의존성 배열이 비어있어도 문제없음

  const todayMap = ["일", "월", "화", "수", "목", "금", "토"];
  const today = todayMap[new Date().getDay()];

  const openEdit = (day, time) => {
    if (!editable) return;
    const cell = schedule[day][time] || { text: "", highlight: false };
    setEdit({ show: true, day, time, text: cell.text, highlight: cell.highlight });
  };

  const saveEdit = async () => {
    const updated = {
      ...schedule,
      [edit.day]: {
        ...schedule[edit.day],
        [edit.time]: { text: edit.text, highlight: edit.highlight },
      },
    };
    setSchedule(updated);
    await setDoc(doc(db, "afterSchool", "schedule"), updated, { merge: true });
    setEdit({ ...edit, show: false });
  };

  // 로딩 중이거나 데이터가 아직 로드되지 않았을 때
  if (loading || !schedule) return <Spinner animation="border" />;

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
                <td
                  key={d}
                  className={
                    (d === today ? "today-col " : "") +
                    (schedule[d][t].highlight ? "highlight-cell" : "")
                  }
                  style={{ cursor: editable ? "pointer" : "default" }}
                  onClick={() => openEdit(d, t)}
                >
                  {schedule[d][t].text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={edit.show} onHide={() => setEdit({ ...edit, show: false })} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {edit.day}요일 {edit.time}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>내용</Form.Label>
            <Form.Control
              value={edit.text}
              onChange={(e) => setEdit({ ...edit, text: e.target.value })}
            />
          </Form.Group>
          <Form.Check
            type="checkbox"
            label="강조하기"
            checked={edit.highlight}
            onChange={(e) => setEdit({ ...edit, highlight: e.target.checked })}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEdit({ ...edit, show: false })}>
            취소
          </Button>
          <Button variant="primary" onClick={saveEdit}>
            저장
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
