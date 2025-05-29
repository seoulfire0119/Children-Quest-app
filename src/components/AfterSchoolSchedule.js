import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Table, Modal, Button, Form } from "react-bootstrap";
// Assuming db is correctly configured in this path
// import { db } from "../firebase"; 
// For standalone functionality, let's mock db and its functions
// In a real Firebase setup, you would use the actual imports.

// --- Firebase Firestore Mock Start ---
// This is a mock for demonstration if firebase is not set up.
// In a real application, ensure firebase is initialized and db is exported from '../firebase'.
const mockDb = {
  collectionName: "afterSchool",
  docName: "schedule",
  data: {}, // Stores the schedule data in memory
};

const doc = (db, collectionName, docName) => {
  // Mocking the doc function
  return {
    _db: db,
    _collectionName: collectionName,
    _docName: docName,
    path: `${collectionName}/${docName}`, // For debugging or logging
  };
};

const getDoc = async (docRef) => {
  // Mocking getDoc
  // Simulating an async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  if (docRef._collectionName === mockDb.collectionName && docRef._docName === mockDb.docName) {
    if (Object.keys(mockDb.data).length > 0) {
      return {
        exists: () => true,
        data: () => JSON.parse(JSON.stringify(mockDb.data)), // Return a deep copy
      };
    }
  }
  return { exists: () => false };
};

const setDoc = async (docRef, data, options) => {
  // Mocking setDoc
  await new Promise(resolve => setTimeout(resolve, 100));
  if (docRef._collectionName === mockDb.collectionName && docRef._docName === mockDb.docName) {
    if (options && options.merge) {
      // Deep merge for nested objects like schedule structure
      const mergeDeep = (target, source) => {
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            mergeDeep(target[key], source[key]);
          } else {
            Object.assign(target, { [key]: source[key] });
          }
        }
      }
      mergeDeep(mockDb.data, data);
    } else {
      mockDb.data = JSON.parse(JSON.stringify(data)); // Store a deep copy
    }
    console.log("Mock Firestore: Data saved for", docRef.path, mockDb.data);
    return;
  }
  throw new Error("Mock Firestore: Error saving document.");
};
const db = mockDb; // Use the mock db
// --- Firebase Firestore Mock End ---


// Assuming AfterSchool.css exists and provides necessary styles
// For example:
// .after-school-table .today-col { background-color: #e6f7ff; }
// .after-school-table .highlight { background-color: #fffbe6; font-weight: bold; }
// .after-school-table .editable-cell:hover { background-color: #f0f0f0; }
// .time-col { font-weight: bold; background-color: #f8f9fa; }

export default function AfterSchoolSchedule({ editable }) {
  // Define times and days for the schedule
  const times = ["1시", "2시", "3시", "4시", "5시", "6시", "7시"];
  const days = ["월", "화", "수", "목", "금"];

  // Function to create a default empty schedule structure
 const createDefault = useCallback(() => {
  const obj = {};
  days.forEach((d) => {
    obj[d] = {};
    times.forEach((t) => {
      obj[d][t] = { text: "", highlight: false };
    });
  });
  return obj;
}, [days, times]); // 👈 의존성을 명시적으로 추가

  // State for the schedule data
  const [schedule, setSchedule] = useState(createDefault());
  // State to manage which cell is currently being edited
  const [editCell, setEditCell] = useState(null); // null or { day, time, text, highlight }
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
  const openEditor = (day, time) => {
    if (!editable) return; // Only open if the schedule is in editable mode
    const currentCellData = schedule[day]?.[time] || { text: "", highlight: false };
    setEditCell({ day, time, text: currentCellData.text, highlight: currentCellData.highlight });
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
            {days.map((d) => (
              <th key={d} className={d === today ? "today-col table-info" : ""} style={{ width: '18%' }}>
                {d} {/* Day column header (Mon, Tue, etc.) */}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t, i) => (
            <tr key={t} className={`row-${i + 1}`}>
              <td className="time-col align-middle">{t}</td> {/* Time slot (1시, 2시, etc.) */}
              {days.map((d) => {
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
                    onClick={() => openEditor(d, t)}
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
                  {editCell.day}요일 {editCell.time} {/* Display which cell is being edited */}
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
       {/* Mock data persistence note for testing */}
       {!editable && (
         <div className="mt-3 p-2 bg-light border rounded small">
            <p className="mb-1"><strong>참고:</strong> 현재 읽기 전용 모드입니다.</p>
            {Object.keys(mockDb.data).length > 0 && (
                <p className="mb-0">
                    (테스트용 목업 데이터가 로드되었습니다. 편집 모드로 전환하여 내용을 수정하고 저장할 수 있습니다.)
                </p>
            )}
         </div>
       )}
    </div>
  );
}
