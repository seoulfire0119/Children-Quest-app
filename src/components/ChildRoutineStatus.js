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
import DEFAULT_ROUTINE_USAGE from "./defaultRoutineUsage";
import DEFAULT_ROUTINE_POINTS from "./defaultRoutinePoints";
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
  const [points, setPoints] = useState({
    morning: DEFAULT_ROUTINE_TASKS.morning.map(
      () => DEFAULT_ROUTINE_POINTS.morning
    ),
    afternoon: DEFAULT_ROUTINE_TASKS.afternoon.map(
      () => DEFAULT_ROUTINE_POINTS.afternoon
    ),
    vacation: DEFAULT_ROUTINE_TASKS.vacation.map(
      () => DEFAULT_ROUTINE_POINTS.vacation
    ),
    optional: DEFAULT_ROUTINE_TASKS.optional.map(
      () => DEFAULT_ROUTINE_POINTS.optional
    ),
  });
  const [pointsBase, setPointsBase] = useState({
    morning: DEFAULT_ROUTINE_POINTS.morning,
    afternoon: DEFAULT_ROUTINE_POINTS.afternoon,
    vacation: DEFAULT_ROUTINE_POINTS.vacation,
    optional: DEFAULT_ROUTINE_POINTS.optional,
  });
  const [useFlags, setUseFlags] = useState(DEFAULT_ROUTINE_USAGE);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = getLocalDateKey(); // e.g. 2025‑05‑29

  /* ── fetch daily + config ─────────────── */
  useEffect(() => {
    if (!childUid) {
      setRoutine(emptyDailyStatus(DEFAULT_ROUTINE_TASKS));
      setTasks(DEFAULT_ROUTINE_TASKS);
      setPoints({
        morning: DEFAULT_ROUTINE_TASKS.morning.map(
          () => DEFAULT_ROUTINE_POINTS.morning
        ),
        afternoon: DEFAULT_ROUTINE_TASKS.afternoon.map(
          () => DEFAULT_ROUTINE_POINTS.afternoon
        ),
        vacation: DEFAULT_ROUTINE_TASKS.vacation.map(
          () => DEFAULT_ROUTINE_POINTS.vacation
        ),
        optional: DEFAULT_ROUTINE_TASKS.optional.map(
          () => DEFAULT_ROUTINE_POINTS.optional
        ),
      });
      setPointsBase({
        morning: DEFAULT_ROUTINE_POINTS.morning,
        afternoon: DEFAULT_ROUTINE_POINTS.afternoon,
        vacation: DEFAULT_ROUTINE_POINTS.vacation,
        optional: DEFAULT_ROUTINE_POINTS.optional,
      });
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
              vacation:
                cfgSnap.data().tasks_vacation || DEFAULT_ROUTINE_TASKS.vacation,
              optional:
                cfgSnap.data().tasks_optional || DEFAULT_ROUTINE_TASKS.optional,
            }
          : DEFAULT_ROUTINE_TASKS;
        setTasks(newTasks);

        // points config
        const def = DEFAULT_ROUTINE_POINTS;
        const newPoints = cfgSnap.exists()
          ? {
              morning:
                cfgSnap.data().points_morning ||
                newTasks.morning.map(() => def.morning),
              afternoon:
                cfgSnap.data().points_afternoon ||
                newTasks.afternoon.map(() => def.afternoon),
              vacation:
                cfgSnap.data().points_vacation ||
                newTasks.vacation.map(() => def.vacation),
              optional:
                cfgSnap.data().points_optional ||
                newTasks.optional.map(() => def.optional),
            }
          : {
              morning: newTasks.morning.map(() => def.morning),
              afternoon: newTasks.afternoon.map(() => def.afternoon),
              vacation: newTasks.vacation.map(() => def.vacation),
              optional: newTasks.optional.map(() => def.optional),
            };
        setPoints(newPoints);

        const newBase = cfgSnap.exists()
          ? {
              morning: cfgSnap.data().points_base_morning ?? def.morning,
              afternoon: cfgSnap.data().points_base_afternoon ?? def.afternoon,
              vacation: cfgSnap.data().points_base_vacation ?? def.vacation,
              optional: cfgSnap.data().points_base_optional ?? def.optional,
            }
          : {
              morning: def.morning,
              afternoon: def.afternoon,
              vacation: def.vacation,
              optional: def.optional,
            };
        setPointsBase(newBase);

        const newUse = cfgSnap.exists()
          ? {
              morning:
                cfgSnap.data().use_morning !== undefined
                  ? cfgSnap.data().use_morning
                  : DEFAULT_ROUTINE_USAGE.morning,
              afternoon:
                cfgSnap.data().use_afternoon !== undefined
                  ? cfgSnap.data().use_afternoon
                  : DEFAULT_ROUTINE_USAGE.afternoon,
              vacation:
                cfgSnap.data().use_vacation !== undefined
                  ? cfgSnap.data().use_vacation
                  : DEFAULT_ROUTINE_USAGE.vacation,
              optional:
                cfgSnap.data().use_optional !== undefined
                  ? cfgSnap.data().use_optional
                  : DEFAULT_ROUTINE_USAGE.optional,
            }
          : DEFAULT_ROUTINE_USAGE;
        setUseFlags(newUse);

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
      const val =
        points[sessionKey]?.[taskIdx - 1] ||
        DEFAULT_ROUTINE_POINTS[sessionKey] ||
        0;
      const delta = newStatus ? val : -val;
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
      const proofUrl = routine[key]?.proofUrls?.[i];
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
          {proofUrl && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-2"
              onClick={(e) => {
                e.stopPropagation();
                window.open(proofUrl, "_blank");
              }}
            >
              증거보기
            </Button>
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">오늘의 루틴 ({today})</h4>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => setShowEdit(true)}
        >
          루틴 수정
        </Button>
      </div>

      {useFlags.morning && (
        <Card className="mb-4 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>
              🌅 등교 전 루틴
              <Badge bg="primary" pill className="ms-2">
                완료 {routine.morning.completedCount || 0}/
                {tasks.morning.length}
              </Badge>
            </span>
          </Card.Header>
          <ListGroup variant="flush">{renderTasks("morning")}</ListGroup>
        </Card>
      )}

      {useFlags.afternoon && (
        <Card className="mb-4 shadow-sm">
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
      )}

      {useFlags.vacation && (
        <Card className="mb-4 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>
              🏖️ 방학 퀘스트
              <Badge bg="primary" pill className="ms-2">
                완료 {routine.vacation.completedCount || 0}/
                {tasks.vacation.length}
              </Badge>
            </span>
          </Card.Header>
          <ListGroup variant="flush">{renderTasks("vacation")}</ListGroup>
        </Card>
      )}

      {useFlags.optional && (
        <Card className="shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>
              🎲 선택 퀘스트
              <Badge bg="primary" pill className="ms-2">
                완료 {routine.optional.completedCount || 0}/
                {tasks.optional.length}
              </Badge>
            </span>
          </Card.Header>
          <ListGroup variant="flush">{renderTasks("optional")}</ListGroup>
        </Card>
      )}

      {/* edit modal */}
      <RoutineEditModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        config={{
          ...tasks,
          pointsMorning: points.morning,
          pointsAfternoon: points.afternoon,
          pointsVacation: points.vacation,
          pointsOptional: points.optional,
          pointsMorningBase: pointsBase.morning,
          pointsAfternoonBase: pointsBase.afternoon,
          pointsVacationBase: pointsBase.vacation,
          pointsOptionalBase: pointsBase.optional,
          useMorning: useFlags.morning,
          useAfternoon: useFlags.afternoon,
          useVacation: useFlags.vacation,
          useOptional: useFlags.optional,
        }}
        onSave={async (updated) => {
          try {
            await setDoc(
              doc(db, "routines", childUid),
              {
                tasks_morning: updated.morning,
                tasks_afternoon: updated.afternoon,
                tasks_vacation: updated.vacation,
                tasks_optional: updated.optional,
                points_morning: updated.pointsMorning,
                points_afternoon: updated.pointsAfternoon,
                points_vacation: updated.pointsVacation,
                points_optional: updated.pointsOptional,
                points_base_morning: updated.pointsMorningBase,
                points_base_afternoon: updated.pointsAfternoonBase,
                points_base_vacation: updated.pointsVacationBase,
                points_base_optional: updated.pointsOptionalBase,
                use_morning: updated.useMorning,
                use_afternoon: updated.useAfternoon,
                use_vacation: updated.useVacation,
                use_optional: updated.useOptional,
                updatedAt: Timestamp.now(),
              },
              { merge: true }
            );
            setTasks({
              morning: updated.morning,
              afternoon: updated.afternoon,
              vacation: updated.vacation,
              optional: updated.optional,
            });
            setPoints({
              morning: updated.pointsMorning,
              afternoon: updated.pointsAfternoon,
              vacation: updated.pointsVacation,
              optional: updated.pointsOptional,
            });
            setPointsBase({
              morning: updated.pointsMorningBase,
              afternoon: updated.pointsAfternoonBase,
              vacation: updated.pointsVacationBase,
              optional: updated.pointsOptionalBase,
            });
            setUseFlags({
              morning: updated.useMorning,
              afternoon: updated.useAfternoon,
              vacation: updated.useVacation,
              optional: updated.useOptional,
            });
            setRoutine(
              emptyDailyStatus({
                morning: updated.morning,
                afternoon: updated.afternoon,
                vacation: updated.vacation,
                optional: updated.optional,
              })
            );
            setShowEdit(false);
          } catch (err) {
            console.error("save routine tasks", err);
          }
        }}
      />
    </div>
  );
}
