import React, { useEffect, useState } from "react";
import { Table, Modal, Button, Form } from "react-bootstrap";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/AfterSchool.css";

// Assume db is correctly configured in this path
// import { db } from "../firebase";



// Assuming AfterSchool.css exists and provides necessary styles

// ## 변경점 1: 성능 최적화를 위해 상수와 헬퍼 함수를 컴포넌트 밖으로 이동
const TIMES = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
const DAYS = ["월", "화", "수", "목", "금"];

// 기본 스케줄 구조를 생성하는 함수
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

export default function AfterSchoolSchedule({ editable }) {
  // State for the schedule data
  const [schedule, setSchedule] = useState(createDefaultSchedule());
  // State to manage which cell is currently being edited
  const [editCell, setEditCell] = useState(null); // { day, time, text, highlight }
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // Firestore에서 스케줄 데이터를 가져오는 useEffect
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const scheduleDocRef = doc(db, "afterSchool", "schedule");
        const snap = await getDoc(scheduleDocRef);
        if (mounted) {
          if (snap.exists()) {
            setSchedule({ ...createDefaultSchedule(), ...snap.data() });
          } else {
            setSchedule(createDefaultSchedule());
            console.log("No schedule found in Firestore, using default.");
          }
        }
      } catch (e) {
        console.error("Error loading afterSchool schedule:", e);
        if (mounted) setSchedule(createDefaultSchedule());
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 현재 수정 중인 셀 데이터를 저장하는 함수
  const saveCell = async () => {
    if (!editCell) return;

    const { day, time, text, highlight } = editCell;
    const updatedSchedule = {
      ...schedule,
      [day]: {
        ...schedule[day],
        [time]: { text, highlight },
      },
    };

    setSchedule(updatedSchedule);

    try {
      const scheduleDocRef = doc(db, "afterSchool", "schedule");
      await setDoc(scheduleDocRef, updatedSchedule, { merge: true });
      console.log("Schedule saved successfully to Firestore.");
    } catch (e) {
      console.error("Error saving afterSchool schedule:", e);
    }
    setEditCell(null);
  };
  
  // ## 변경점 2: DAYS가 문자열 배열이므로, dayKey와 time만 인자로 받음
  // 특정 셀의 편집 모달을 여는 함수
  const openEditor = (day, time) => {
    if (!editable) return;
    const currentCellData = schedule[day]?.[time] || { text: "", highlight: false };
    setEditCell({ day, time, text: currentCellData.text, highlight: currentCellData.highlight });
  };

  const todayMap = ["일", "월", "화", "수", "목", "금", "토"];
  const today = todayMap[new Date().getDay()];

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div>Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="after-school p-3">
      <h2 className="text-center mb-4">방과 후 활동 시간표</h2>
      <Table bordered className="text-center fs-5 after-school-table shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: '10%' }}>시간</th>
            {/* ## 변경점 3: d.key, d.label 대신 d를 직접 사용 */}
            {DAYS.map((d) => (
              <th key={d} className={d === today ? "today-col table-info" : ""} style={{ width: '18%' }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((t, i) => (
            <tr key={t} className={`row-${i + 1}`}>
              <td className="time-col align-middle">{t}</td>
              {DAYS.map((d) => {
                // ## 변경점 4: schedule[d.key] 대신 schedule[d] 사용
                const cellData = schedule[d]?.[t] || { text: "", highlight: false };
                return (
                  <td
                    key={`${d}-${t}`}
                    className={`
                      ${d === today ? "today-col" : ""}
                      ${cellData.highlight ? "highlight" : ""}
                      ${editable ? "editable-cell" : ""}
                      align-middle
                    `}
                    // ## 변경점 5: openEditor 인자 수정
                    onClick={() => openEditor(d, t)}
                    style={{
                      cursor: editable ? "pointer" : "default",
                      minHeight: '60px',
                      verticalAlign: 'middle'
                    }}
                  >
                    {cellData.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 시간표 셀 수정을 위한 모달 */}
      {editable && editCell && (
        <Modal show={!!editCell} onHide={() => setEditCell(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>시간표 항목 수정</Modal.Title>
          </Modal.Header>
          {editCell && (
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {/* ## 변경점 6: editCell.label 대신 editCell.day 사용 */}
                  {editCell.day}요일 {editCell.time}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editCell.text}
                  onChange={(e) =>
                    setEditCell({ ...editCell, text: e.target.value })
                  }
                  placeholder="활동 내용을 입력하세요 (예: 수학 보충)"
                />
              </Form.Group>
              <Form.Check
                type="switch"
                id="highlight-switch"
                label="이 항목 강조하기"
                checked={editCell.highlight}
                onChange={(e) =>
                  setEditCell({ ...editCell, highlight: e.target.checked })
                }
              />
            </Modal.Body>
          )}
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
      
     {!editable && (
          <div className="mt-3 p-2 bg-light border rounded small">
            <p className="mb-1"><strong>참고:</strong> 현재 읽기 전용 모드입니다.</p>
            {/* Mock DB 관련 코드를 완전히 삭제 */}
          </div>
      )}
    </div>
  );
}
