import React, { useEffect, useState } from "react";
import { Table, Modal, Button, Form } from "react-bootstrap";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";


// Assuming AfterSchool.css exists and provides necessary styles
// For example:
// .after-school-table .today-col { background-color: #e6f7ff; }
// .after-school-table .highlight { background-color: #fffbe6; font-weight: bold; }
// .after-school-table .editable-cell:hover { background-color: #f0f0f0; }
// .time-col { font-weight: bold; background-color: #f8f9fa; }

export default function AfterSchoolSchedule({ editable }) {
  // Define times and days for the schedule
  const times = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
  const DAYS = [
    { key: "mon", label: "월" },
    { key: "tue", label: "화" },
    { key: "wed", label: "수" },
    { key: "thu", label: "목" },
    { key: "fri", label: "금" },
  ];

  // Function to create a default empty schedule structure
  const createDefault = () => {
    const obj = {};
    DAYS.forEach((d) => {
      obj[d.key] = {};
      times.forEach((t) => {
        obj[d.key][t] = { text: "", highlight: false };
      });
    });
    return obj;
  };

  // State for the schedule data
  const [schedule, setSchedule] = useState(createDefault());
  // State to manage which cell is currently being edited
  // { day: key, label, time, text, highlight }
  const [editCell, setEditCell] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // useEffect to fetch schedule data from Firestore when the component mounts
  useEffect(() => {
    let mounted = true; // Flag to prevent state updates if component is unmounted
    setIsLoading(true);
    (async () => {
      try {
        // Create a document reference
        const scheduleDocRef = doc(db, "afterSchool", "schedule");
        // Fetch the document
        const snap = await getDoc(scheduleDocRef);
        if (mounted) {
          if (snap.exists()) {
            // If document exists, merge its data with the default structure
            // This ensures all cells are present even if some are not in Firestore
            setSchedule({ ...createDefault(), ...snap.data() });
          } else {
            // If no document exists, use the default empty schedule
            setSchedule(createDefault());
            console.log("No schedule found in Firestore, using default.");
          }
        }
      } catch (e) {
        console.error("Error loading afterSchool schedule:", e);
        if (mounted) setSchedule(createDefault()); // Fallback to default on error
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    // Cleanup function to set mounted to false when component unmounts
    return () => {
      mounted = false;
    };
  }, [createDefault]); // Empty dependency array means this effect runs once on mount

  // Function to save the currently edited cell's data
  const saveCell = async () => {
    if (!editCell) return; // Do nothing if no cell is being edited

    const { day, time, text, highlight } = editCell;
    // Create an updated schedule object
    const updatedSchedule = {
      ...schedule,
      [day]: {
        ...schedule[day],
        [time]: { text, highlight },
      },
    };

    setSchedule(updatedSchedule); // Optimistically update the local state

    try {
      // Create a document reference
      const scheduleDocRef = doc(db, "afterSchool", "schedule");
      // Save the updated schedule to Firestore, merging with existing data
      await setDoc(scheduleDocRef, updatedSchedule, { merge: true });
      console.log("Schedule saved successfully to Firestore.");
    } catch (e) {
      console.error("Error saving afterSchool schedule:", e);
      // Potentially revert optimistic update here or show an error message
    }
    setEditCell(null); // Close the edit modal
  };

  // Function to open the editor modal for a specific cell
  const openEditor = (dayKey, time, label) => {
    if (!editable) return;
    const currentCellData = schedule[dayKey]?.[time] || { text: "", highlight: false };
    setEditCell({ day: dayKey, label, time, text: currentCellData.text, highlight: currentCellData.highlight });
  };

  // Determine the current day to highlight the respective column
  const todayMap = ["일", "월", "화", "수", "목", "금", "토"]; // Sunday to Saturday
  const today = todayMap[new Date().getDay()];

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        {/* Using a simple text loader as Spinner might not be available without react-bootstrap properly set up */}
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
            <th style={{ width: '10%' }}>시간</th> {/* Time column header */}
            {DAYS.map((d) => (
              <th
                key={d.key}
                className={d.label === today ? "today-col table-info" : ""}
                style={{ width: '18%' }}
              >
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t, i) => (
            <tr key={t} className={`row-${i + 1}`}>
              <td className="time-col align-middle">{t}</td> {/* Time slot (1시, 2시, etc.) */}
              {DAYS.map((d) => {
                const cellData = schedule[d.key]?.[t] || { text: "", highlight: false };
                return (
                  <td
                    key={`${d.key}-${t}`}
                    className={`
                      ${d.label === today ? "today-col" : ""}
                      ${cellData.highlight ? "highlight" : ""}
                      ${editable ? "editable-cell" : ""}
                      align-middle
                    `}
                    onClick={() => openEditor(d.key, t, d.label)}
                    style={{ 
                      cursor: editable ? "pointer" : "default",
                      minHeight: '60px', // Ensure cells have some height
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

      {/* Modal for editing a schedule cell */}
      {editable && editCell && (
        <Modal show={!!editCell} onHide={() => setEditCell(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>시간표 항목 수정</Modal.Title>
          </Modal.Header>
          {editCell && ( // Ensure editCell is not null before accessing its properties
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {editCell.label}요일 {editCell.time}
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
    </div>
  );
}
