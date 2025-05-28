import React, { useEffect, useState, useMemo } from "react";
import DEFAULT_ROUTINE_TASKS from "./defaultRoutineTasks.js";
import { auth, db } from "../firebase";
import getLocalDateKey from "../utils/getLocalDateKey";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ListGroup, Form, Badge, Spinner } from "react-bootstrap";

/* ─────────────────────────────────────────── */
const createInitialState = (tasks) => {
  const obj = {};
  tasks.forEach((_, i) => {
    obj[i + 1] = false;
  });
  obj.completedCount = 0;
  obj.awardedSteps = [];
  return obj;
};

export default function RoutineList({ session }) {
  /* ── task list (configurable) ─────────── */
  const uid = auth.currentUser?.uid;
  const [TASKS, setTASKS] = useState(
    session === "morning"
      ? DEFAULT_ROUTINE_TASKS.morning
      : DEFAULT_ROUTINE_TASKS.afternoon
  );

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const cfgSnap = await getDoc(doc(db, "routines", uid));
        if (cfgSnap.exists()) {
          const data = cfgSnap.data();
          setTASKS(
            session === "morning"
              ? data.tasks_morning || DEFAULT_ROUTINE_TASKS.morning
              : data.tasks_afternoon || DEFAULT_ROUTINE_TASKS.afternoon
          );
        }
      } catch (err) {
        console.error("Load routine config error", err);
      }
    })();
  }, [uid, session]);

  /* ── initial state ───────────────────── */
  const initialState = useMemo(() => createInitialState(TASKS), [TASKS]);
  const [steps, setSteps] = useState(initialState);
  const [loading, setLoading] = useState(true);

  const today = getLocalDateKey();
  const docRef = uid && doc(db, "routines", uid, "daily", today);

  /* ── load from Firestore ─────────────── */
  useEffect(() => {
    if (!uid || !docRef) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        let data = initialState;
        if (snap.exists()) {
          const existing = snap.data()[session];
          if (existing) {
            data = { ...initialState, ...existing };
            if (!data.awardedSteps) data.awardedSteps = [];
            if (JSON.stringify(existing) !== JSON.stringify(data)) {
              await updateDoc(docRef, { [session]: data, updatedAt: Timestamp.now() });
            }
          } else {
            await updateDoc(docRef, { [session]: initialState, updatedAt: Timestamp.now() });
          }
        } else {
          await setDoc(
            docRef,
            {
              morning:
                session === "morning"
                  ? initialState
                  : createInitialState(DEFAULT_ROUTINE_TASKS.morning),
              afternoon:
                session === "afternoon"
                  ? initialState
                  : createInitialState(DEFAULT_ROUTINE_TASKS.afternoon),
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );
        }
        mounted && setSteps(data);
      } catch (err) {
        if (err.code !== "permission-denied") console.error("Routine load error", err);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid, docRef, initialState, session, today]);

  /* ── toggle handler ──────────────────── */
  const toggleStep = async (idx) => {
    if (!uid) return;
    try {
      const userRef = doc(db, "users", uid);
      const updated = { ...steps };
      const newVal = !steps[idx];
      updated[idx] = newVal;

      // recalc completed count
      updated.completedCount = TASKS.reduce((acc, _, i) => acc + (updated[i + 1] ? 1 : 0), 0);

      const awarded = updated.awardedSteps || [];
      if (newVal) {
        if (!awarded.includes(idx)) {
          await updateDoc(userRef, { points: increment(10) });
          updated.awardedSteps = [...awarded, idx];
          await updateDoc(docRef, { [`${session}.awardedSteps`]: arrayUnion(idx) });
        }
      } else {
        if (awarded.includes(idx)) {
          await updateDoc(userRef, { points: increment(-10) });
          updated.awardedSteps = awarded.filter((n) => n !== idx);
          await updateDoc(docRef, { [`${session}.awardedSteps`]: arrayRemove(idx) });
        }
      }

      setSteps(updated);
      await updateDoc(docRef, { [session]: updated, updatedAt: Timestamp.now() });
    } catch (err) {
      console.error("Error toggling step", err);
      setSteps(steps); // rollback UI
    }
  };

  /* ── render ──────────────────────────── */
  if (!uid) return null;
  if (loading) return <Spinner animation="border" />;

  return (
    <div className="mb-4">
      <h5>
        {session === "morning" ? "🌅 등교 전 루틴" : "🌆 하교 후 루틴"} {" "}
        <Badge bg="secondary">
          {steps.completedCount} / {TASKS.length}
        </Badge>
      </h5>
      <ListGroup>
        {TASKS.map((label, i) => (
          <ListGroup.Item
            key={i}
            action
            onClick={() => toggleStep(i + 1)}
            className="d-flex align-items-center"
          >
            <Form.Check
              type="checkbox"
              checked={steps[i + 1] || false}
              onChange={() => toggleStep(i + 1)}
              className="me-2"
              readOnly
            />
            <span style={{ textDecoration: steps[i + 1] ? "line-through" : "none" }}>
              {label}
            </span>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
}
