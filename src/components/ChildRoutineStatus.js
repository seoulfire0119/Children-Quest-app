import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Card, Badge, ListGroup, Spinner, Button, Form } from "react-bootstrap";
import getLocalDateKey from "../utils/getLocalDateKey";
import DEFAULT_ROUTINE_TASKS from "./defaultRoutineTasks";
import RoutineEditModal from "./RoutineEditModal";

/* ───────────────────────────────────────────
   Helper
   ─────────────────────────────────────────── */
const emptyDailyStatus = (tasks) => {
  const obj = {};
  Object.entries(tasks).forEach(([session, list]) => {
    obj[session] = {};
    list.forEach((_, i) => {
      obj[session][i + 1] = false; // tasks are 1‑based
    });
    obj[session].completedCount = 0;
  });
  return obj;
};

/* ───────────────────────────────────────────
   Component
   ─────────────────────────────────────────── */
export default function ChildRoutineStatus({ childUid }) {
  const [routine, setRoutine] = useState(
    emptyDailyStatus(DEFAULT_ROUTINE_TASKS)
  );
  const [tasks, setTasks] = useState(DEFAULT_ROUTINE_TASKS);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const today = getLocalDateKey(); // e.g. 2025‑05‑29

  /* ── fetch daily + config ─────────────── */
  useEffect(() => {
    if (!childUid) {
      setRoutine(emptyDailyStatus(DEFAULT_ROUTINE_TASKS));
      setTasks(DEFAULT_ROUTINE_TASKS);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const dailyRef = doc(db, "routines", childUid, "daily", today);
        const cfgRef = doc(db, "routines", childUid);

        const [dailySnap, cfgSnap] = await Promise.all([
          getDoc(dailyRef),
          getDoc(cfgRef),
        ]);

        // tasks config
        const newTasks = cfgSnap.exists()
          ? {
              morning:
                cfgSnap.data().tasks_morning || DEFAULT_ROUTINE_TASKS.morning,
              afternoon:
                cfgSnap.data().tasks_afternoon ||
                DEFAULT_ROUTINE_TASKS.afternoon,
            }
          : DEFAULT_ROUTINE_TASKS;
        setTasks(newTasks);

        // daily status
        if (dailySnap.exists()) {
          setRoutine((prev) => ({ ...prev, ...dailySnap.data() }));
        } else {
          setRoutine(emptyDailyStatus(newTasks));
        }
      } catch (err) {
        console.error("child routine load", err);
        setRoutine(emptyDailyStatus(DEFAULT_ROUTINE_TASKS));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [childUid, today]);

  /* ── toggle step ──────────────────────── */
  const toggleStep = async (sessionKey, taskIdx) => {
    if (!window.confirm("루틴 체크내역을 변경하시겠습니까?")) return;

    const newStatus = !(routine[sessionKey]?.[taskIdx] || false);
    const updatedSession = { ...routine[sessionKey] };
    updatedSession[taskIdx] = newStatus;

    const total = tasks[sessionKey].reduce(
      (acc, _, i) => acc + (updatedSession[i + 1] ? 1 : 0),
      0
    );
    updatedSession.completedCount = total;

    const newRoutine = { ...routine, [sessionKey]: updatedSession };
    setRoutine(newRoutine);

    try {
      // save daily
      await setDoc(
        doc(db, "routines", childUid, "daily", today),
        { [sessionKey]: updatedSession, updatedAt: Timestamp.now() },
        { merge: true }
      );

      // update points
      const delta = newStatus ? 20 : -20;
      await updateDoc(doc(db, "users", childUid), {
        points: increment(delta),
      });
    } catch (err) {
      console.error("toggle step", err);
    }
  };

  /* ── render helpers ───────────────────── */
  const renderTasks = (key) =>
    tasks[key]?.map((label, idx) => {
      const i = idx + 1;
      const done = routine[key]?.[i] || false;
      return (
        <ListGroup.Item
          key={`${key}-${i}`}
          action
          className={`d-flex align-items-center ${
            done ? "list-group-item-success" : ""
          }`}
          onClick={() => toggleStep(key, i)}
        >
          <Form.Check
            type="checkbox"
            checked={done}
            readOnly
            className="me-2"
          />
          <span
            style={{
              textDecoration: done ? "line-through" : "none",
              flexGrow: 1,
            }}
          >
            {label}
          </span>
          {done && (
            <Badge bg="success" pill className="ms-auto">
              완료
            </Badge>
          )}
        </ListGroup.Item>
      );
    });

  /* ── UI ───────────────────────────────── */
  if (loading)
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <div className="p-3">
      <h4 className="mb-3">오늘의 루틴 ({today})</h4>

      {/* morning card */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>
            🌅 등교 전 루틴
            <Badge bg="primary" pill className="ms-2">
              완료 {routine.morning.completedCount || 0}/{tasks.morning.length}
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

      {/* afternoon card */}
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>
            🌆 하교 후 루틴
            <Badge bg="primary" pill className="ms-2">
              완료 {routine.afternoon.completedCount || 0}/
              {tasks.afternoon.length}
            </Badge>
          </span>
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("afternoon")}</ListGroup>
      </Card>

      {/* edit modal */}
      <RoutineEditModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        tasks={tasks}
        onSave={async (updated) => {
          try {
            await setDoc(
              doc(db, "routines", childUid),
              {
                tasks_morning: updated.morning,
                tasks_afternoon: updated.afternoon,
                updatedAt: Timestamp.now(),
              },
              { merge: true }
            );
            setTasks(updated);
            setRoutine(emptyDailyStatus(updated));
            setShowEdit(false);
          } catch (err) {
            console.error("save routine tasks", err);
          }
        }}
      />
    </div>
  );
}
