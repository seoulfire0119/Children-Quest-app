import React, { useState, useEffect } from "react";
// import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Timestamp, // Kept from 'main' branch
} from "firebase/firestore";
// import { db } from "../firebase"; // Assuming db is correctly configured
import { Card, Badge, ListGroup, Spinner, Button, Form } from "react-bootstrap";
// import getLocalDateKey from "../utils/getLocalDateKey";
// import DEFAULT_ROUTINE_TASKS from "./defaultRoutineTasks.js";
// import RoutineEditModal from "./RoutineEditModal";

// --- Firebase Firestore Mock Start ---
const mockDb = {
  routines: {}, // Stores routine data: childUid -> { daily: { dateKey: data }, config: data }
  users: {},    // Stores user data: childUid -> { points: number }
};

const mockFirebase = {
  doc: (db, collection, ...pathSegments) => {
    return {
      _db: db, // Store reference to the mockDb instance
      _collection: collection,
      _pathSegments: pathSegments,
      path: `${collection}/${pathSegments.join('/')}`,
    };
  },
  getDoc: async (docRef) => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
    let data;
    if (docRef._collection === "routines") {
      const [childUid, type, dateKey] = docRef._pathSegments;
      if (type === "daily") {
        data = docRef._db.routines[childUid]?.daily?.[dateKey];
      } else { // config
        data = docRef._db.routines[childUid]?.config;
      }
    } else if (docRef._collection === "users") {
      const [childUid] = docRef._pathSegments;
      data = docRef._db.users[childUid];
    }
    if (data) {
      return { exists: () => true, data: () => JSON.parse(JSON.stringify(data)) };
    }
    return { exists: () => false };
  },
  setDoc: async (docRef, data, options) => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
    if (docRef._collection === "routines") {
      const [childUid, type, dateKey] = docRef._pathSegments;
      if (!docRef._db.routines[childUid]) docRef._db.routines[childUid] = { daily: {}, config: {} };
      if (type === "daily") {
        if (!docRef._db.routines[childUid].daily) docRef._db.routines[childUid].daily = {};
        if (options && options.merge) {
          docRef._db.routines[childUid].daily[dateKey] = { ...(docRef._db.routines[childUid].daily[dateKey] || {}), ...data };
        } else {
          docRef._db.routines[childUid].daily[dateKey] = data;
        }
      } else { // config
         if (options && options.merge) {
          docRef._db.routines[childUid].config = { ...(docRef._db.routines[childUid].config || {}), ...data };
        } else {
          docRef._db.routines[childUid].config = data;
        }
      }
      console.log("Mock Firestore: Routine data set for", docRef.path, docRef._db.routines[childUid]);
    }
  },
  updateDoc: async (docRef, data) => {
     await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
    if (docRef._collection === "users") {
      const [childUid] = docRef._pathSegments;
      if (!docRef._db.users[childUid]) docRef._db.users[childUid] = { points: 0 };
      for (const key in data) {
        if (data[key]._operationType === 'increment') { // Mocking increment
          docRef._db.users[childUid][key] = (docRef._db.users[childUid][key] || 0) + data[key]._operand;
        } else {
          docRef._db.users[childUid][key] = data[key];
        }
      }
      console.log("Mock Firestore: User data updated for", docRef.path, docRef._db.users[childUid]);
    }
  },
  increment: (value) => ({ _operationType: 'increment', _operand: value }), // Mock increment
  Timestamp: { // Mock Timestamp
    now: () => ({
      toDate: () => new Date(),
      toString: () => new Date().toISOString(),
      _isMockTimestamp: true,
    })
  }
};
const db = mockDb; // Use the mock db instance
const { Timestamp: FbTimestamp } = mockFirebase; // Use mock Timestamp
// --- Firebase Firestore Mock End ---

// --- Mock Utilities and Components Start ---
const getLocalDateKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // e.g., "2024-05-27"
};

const DEFAULT_ROUTINE_TASKS = {
  morning: ["일어나기", "이불 정리", "세수/양치", "아침 식사", "옷 입기"],
  afternoon: ["숙제하기", "책 읽기", "정리 정돈", "저녁 식사", "양치하기"],
};

const RoutineEditModal = ({ show, onHide, tasks, onSave }) => {
  const [localTasks, setLocalTasks] = useState(JSON.parse(JSON.stringify(tasks))); // Deep copy

  useEffect(() => {
    setLocalTasks(JSON.parse(JSON.stringify(tasks)));
  }, [tasks, show]);

  const handleTaskChange = (session, index, value) => {
    const newTasks = { ...localTasks };
    newTasks[session][index] = value;
    setLocalTasks(newTasks);
  };

  const handleAddTask = (session) => {
    const newTasks = { ...localTasks };
    newTasks[session].push("");
    setLocalTasks(newTasks);
  };
  
  const handleRemoveTask = (session, index) => {
    const newTasks = { ...localTasks };
    newTasks[session].splice(index, 1);
    setLocalTasks(newTasks);
  };

  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 }}>
      <Card style={{ width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
        <Card.Header>루틴 수정</Card.Header>
        <Card.Body>
          {['morning', 'afternoon'].map(session => (
            <div key={session} className="mb-3">
              <h5>{session === 'morning' ? '🌅 등교 전' : '🌆 하교 후'} 루틴</h5>
              {localTasks[session].map((task, index) => (
                <div key={index} className="d-flex mb-2">
                  <Form.Control
                    type="text"
                    value={task}
                    onChange={(e) => handleTaskChange(session, index, e.target.value)}
                    className="me-2"
                  />
                  <Button variant="outline-danger" size="sm" onClick={() => handleRemoveTask(session, index)}>X</Button>
                </div>
              ))}
              <Button variant="outline-success" size="sm" onClick={() => handleAddTask(session)}>+ 항목 추가</Button>
            </div>
          ))}
        </Card.Body>
        <Card.Footer className="text-end">
          <Button variant="secondary" onClick={onHide} className="me-2">취소</Button>
          <Button variant="primary" onClick={() => onSave(localTasks)}>저장</Button>
        </Card.Footer>
      </Card>
    </div>
  );
};
// --- Mock Utilities and Components End ---


export default function ChildRoutineStatus({ childUid }) {
  const [routine, setRoutine] = useState({ morning: {}, afternoon: {} });
  const [tasks, setTasks] = useState(DEFAULT_ROUTINE_TASKS);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const today = getLocalDateKey(); // Utility to get "YYYY-MM-DD"

  useEffect(() => {
    if (!childUid) {
      setRoutine({ morning: {}, afternoon: {} }); // Reset if no childUid
      setTasks(DEFAULT_ROUTINE_TASKS); // Reset tasks to default
      setLoading(false);
      return;
    }

    const fetchRoutine = async () => {
      setLoading(true);
      try {
        // Document references
        const dailyRef = mockFirebase.doc(db, "routines", childUid, "daily", today);
        const configRef = mockFirebase.doc(db, "routines", childUid, "config", "tasks"); // Assuming tasks config is stored in a 'tasks' doc

        const [dailySnap, configSnap] = await Promise.all([
          mockFirebase.getDoc(dailyRef),
          mockFirebase.getDoc(configRef),
        ]);
        
        // Set daily routine status
        if (dailySnap.exists()) {
          setRoutine(dailySnap.data());
        } else {
          // Initialize daily routine if it doesn't exist
          const defaultDailyStatus = { morning: {}, afternoon: {} };
          // You might want to pre-fill with false for all tasks
          Object.keys(DEFAULT_ROUTINE_TASKS).forEach(sessionKey => {
            DEFAULT_ROUTINE_TASKS[sessionKey].forEach((task, index) => {
              defaultDailyStatus[sessionKey][index + 1] = false;
            });
            defaultDailyStatus[sessionKey].completedCount = 0;
          });
          setRoutine(defaultDailyStatus);
        }
        
        // Set configurable tasks
        if (configSnap.exists()) {
          const data = configSnap.data();
          setTasks({
            morning: data.tasks_morning || DEFAULT_ROUTINE_TASKS.morning,
            afternoon: data.tasks_afternoon || DEFAULT_ROUTINE_TASKS.afternoon,
          });
        } else {
          setTasks(DEFAULT_ROUTINE_TASKS); // Fallback to default tasks
        }
      } catch (error) {
        console.error("Error fetching routine:", error);
        setRoutine({ morning: {}, afternoon: {} }); // Fallback on error
        setTasks(DEFAULT_ROUTINE_TASKS);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, [childUid, today]); // Rerun if childUid or today changes

  const toggleStep = async (sessionKey, taskIndex) => { // taskIndex is 1-based
    // Using a custom modal/confirm dialog is better than window.confirm
    // For this example, we'll keep window.confirm as in the original code
    if (!window.confirm("루틴 체크내역을 변경하시겠습니까?")) return;
    
    try {
      const currentStatus = routine[sessionKey]?.[taskIndex] || false;
      const newStatus = !currentStatus;

      // Create a deep copy of the session to update
      const updatedSession = JSON.parse(JSON.stringify(routine[sessionKey] || {}));
      updatedSession[taskIndex] = newStatus;
      
      // Recalculate completedCount for the session
      let count = 0;
      if (tasks[sessionKey] && Array.isArray(tasks[sessionKey])) {
         tasks[sessionKey].forEach((_, i) => {
            if (updatedSession[i + 1]) { // taskIndex is 1-based
                count++;
            }
        });
      }
      updatedSession.completedCount = count;
      
      const newRoutine = { ...routine, [sessionKey]: updatedSession };
      setRoutine(newRoutine); // Optimistic UI update

      // Update daily routine in Firestore
      const dailyDocRef = mockFirebase.doc(db, "routines", childUid, "daily", today);
      await mockFirebase.setDoc(
        dailyDocRef, 
        { 
          [sessionKey]: updatedSession,
          updatedAt: FbTimestamp.now() // Add timestamp from 'main'
        }, 
        { merge: true }
      );

      // Update user points
      const pointsDiff = newStatus ? 20 : -20; // Award/deduct points
      const userDocRef = mockFirebase.doc(db, "users", childUid);
      await mockFirebase.updateDoc(userDocRef, {
        points: mockFirebase.increment(pointsDiff),
      });
      console.log(`Points updated by ${pointsDiff} for user ${childUid}`);

    } catch (error) {
      console.error("Error toggling step:", error);
      // Potentially revert optimistic update here or show an error message
    }
  };

  const renderTasks = (sessionKey) => {
    if (!tasks[sessionKey] || !Array.isArray(tasks[sessionKey])) {
        return <ListGroup.Item>No tasks configured for this session.</ListGroup.Item>;
    }
    return tasks[sessionKey].map((task, index) => {
      const taskNumber = index + 1; // 1-based index for task identification
      const completed = routine[sessionKey]?.[taskNumber] || false;
      return (
        <ListGroup.Item
          key={`${sessionKey}-${index}`}
          action // Makes the item clickable
          onClick={() => toggleStep(sessionKey, taskNumber)}
          className={`d-flex align-items-center ${completed ? 'list-group-item-success' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <Form.Check
            type="checkbox"
            checked={completed}
            readOnly // Kept from 'main', click handled by ListGroup.Item
            className="me-2"
            // onChange is not strictly needed here if ListGroup.Item handles the click
            // but if kept, it should also call toggleStep or be disabled
            onChange={() => toggleStep(sessionKey, taskNumber)} 
          />
          {/* Applying text-decoration for completed tasks */}
          <span style={{ textDecoration: completed ? "line-through" : "none", flexGrow: 1 }}>
            {task}
          </span>
          {completed && <Badge bg="success" pill className="ms-auto">완료</Badge>}
        </ListGroup.Item>
      );
    });
  }


  if (loading) return (
    <div className="text-center p-5">
        <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">루틴 정보를 불러오는 중...</p>
    </div>
  );
  
  // Ensure routine and tasks objects and their sub-properties exist before rendering
  const morningTasks = tasks.morning || [];
  const afternoonTasks = tasks.afternoon || [];
  const morningRoutine = routine.morning || { completedCount: 0 };
  const afternoonRoutine = routine.afternoon || { completedCount: 0 };


  return (
    <div className="p-3">
      <h4 className="mb-3">오늘의 루틴 현황 ({today})</h4>
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>🌅 등교 전 루틴{" "}
            <Badge bg="primary" pill>
              완료 {morningRoutine.completedCount || 0}/{morningTasks.length}
            </Badge>
          </span>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => setShowEdit(true)}
          >
            루틴 수정
          </Button>
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("morning")}</ListGroup>
      </Card>

      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
         <span>🌆 하교 후 루틴{" "}
          <Badge bg="primary" pill>
            완료 {afternoonRoutine.completedCount || 0}/{afternoonTasks.length}
          </Badge>
          </span>
          {/* The edit button could be here too, or a single one for both */}
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("afternoon")}</ListGroup>
      </Card>
      
      <RoutineEditModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        tasks={tasks} // Pass current tasks
        onSave={async (updatedTasks) => {
          try {
            const configDocRef = mockFirebase.doc(db, "routines", childUid, "config", "tasks");
            await mockFirebase.setDoc(
              configDocRef,
              {
                tasks_morning: updatedTasks.morning,
                tasks_afternoon: updatedTasks.afternoon,
                updatedAt: FbTimestamp.now()
              },
              { merge: true } // Merge true to not overwrite other config if any
            );
            setTasks(updatedTasks); // Update local state
            
            // After saving new tasks, we might need to re-evaluate completion counts
            // or reset daily progress if tasks fundamentally change.
            // For simplicity, this example just updates the task list.
            // A more robust solution would handle changes in task list length/content
            // and its effect on existing daily progress.
            
            setShowEdit(false);
            console.log("Routine tasks saved successfully.");
          } catch (error) {
            console.error("Error saving routine tasks:", error);
          }
        }}
      />
       {/* Mock data persistence note for testing */}
       <div className="mt-4 p-3 bg-light border rounded small">
            <p className="mb-1"><strong>테스트 참고:</strong></p>
            <p className="mb-1">이 컴포넌트는 현재 Mock Firebase를 사용하고 있습니다. 데이터는 페이지를 새로고침하면 사라집니다.</p>
            {childUid ? (
                <p className="mb-0">선택된 아동 UID: <strong>{childUid}</strong>. 다른 UID를 props로 전달하여 테스트할 수 있습니다.</p>
            ) : (
                 <p className="mb-0"><code>childUid</code> prop이 전달되지 않았습니다. 테스트를 위해 UID를 전달해주세요.</p>
            )}
       </div>
    </div>
  );
}
