import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import getLocalDateKey from "../utils/getLocalDateKey";
import { Card, Badge, ListGroup, Spinner, Button } from "react-bootstrap";
import DEFAULT_ROUTINE_TASKS from "./defaultRoutineTasks.js";
import RoutineEditModal from "./RoutineEditModal";

export default function ChildRoutineStatus({ childUid }) {
  const [routine, setRoutine] = useState({ morning: {}, afternoon: {} });
  const [tasks, setTasks] = useState(DEFAULT_ROUTINE_TASKS);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const today = getLocalDateKey();

  useEffect(() => {
    if (!childUid) {
      setRoutine({ morning: {}, afternoon: {} });
      setLoading(false);
      return;
    }

    const fetchRoutine = async () => {
      setLoading(true);
      const dailyRef = doc(db, "routines", childUid, "daily", today);
      const configRef = doc(db, "routines", childUid);
      const [dailySnap, configSnap] = await Promise.all([
        getDoc(dailyRef),
        getDoc(configRef),
      ]);
      if (dailySnap.exists()) {
        setRoutine(dailySnap.data());
      } else {
        setRoutine({ morning: {}, afternoon: {} });
      }
      if (configSnap.exists()) {
        const data = configSnap.data();
        setTasks({
          morning: data.tasks_morning || DEFAULT_ROUTINE_TASKS.morning,
          afternoon: data.tasks_afternoon || DEFAULT_ROUTINE_TASKS.afternoon,
        });
      } else {
        setTasks(DEFAULT_ROUTINE_TASKS);
      }
      setLoading(false);
    };

    fetchRoutine();
  }, [childUid, today]);

  if (loading) return <Spinner animation="border" />;

  const toggleStep = async (sessionKey, idx) => {
    if (!window.confirm("루틴체크내역을 변경하시겠습니까?")) return;
    const current = routine[sessionKey][idx] || false;
    const updatedSession = { ...routine[sessionKey], [idx]: !current };
    const count = tasks[sessionKey].reduce(
      (acc, _, i) => acc + (updatedSession[i + 1] ? 1 : 0),
      0
    );
    updatedSession.completedCount = count;
    const newRoutine = { ...routine, [sessionKey]: updatedSession };
    setRoutine(newRoutine);

    const docRef = doc(db, "routines", childUid, "daily", today);
    await setDoc(docRef, { [sessionKey]: updatedSession }, { merge: true });

    const diff = !current ? 20 : -20;
    await updateDoc(doc(db, "users", childUid), {
      points: increment(diff),
    });
  };

  const renderTasks = (sessionKey) =>
    tasks[sessionKey].map((task, index) => {
      const completed = routine[sessionKey][index + 1];
      return (
        <ListGroup.Item
          key={index}
          action
          onClick={() => toggleStep(sessionKey, index + 1)}
        >
          <input
            type="checkbox"
            className="me-2"
            checked={completed || false}
            readOnly
          />
          {task}
        </ListGroup.Item>
      );
    });

  return (
    <div>
      <Card className="mb-3">
        <Card.Header>
          🌅 등교 전 루틴{" "}
          <Badge bg="secondary">
            완료 {routine.morning.completedCount || 0}/{tasks.morning.length}
          </Badge>
          <Button
            size="sm"
            variant="outline-secondary"
            className="ms-2"
            onClick={() => setShowEdit(true)}
          >
            수정
          </Button>
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("morning")}</ListGroup>
      </Card>

      <Card>
        <Card.Header>
          🌆 하교 후 루틴{" "}
          <Badge bg="secondary">
            완료 {routine.afternoon.completedCount || 0}/
            {tasks.afternoon.length}
          </Badge>
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("afternoon")}</ListGroup>
      </Card>
      <RoutineEditModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        tasks={tasks}
        onSave={async (updated) => {
          const docRef = doc(db, "routines", childUid);
          await setDoc(
            docRef,
            {
              tasks_morning: updated.morning,
              tasks_afternoon: updated.afternoon,
            },
            { merge: true }
          );
          setTasks(updated);
          setShowEdit(false);
        }}
      />
    </div>
  );
}
