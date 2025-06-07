import React, { useEffect, useState, useMemo } from "react";
import DEFAULT_ROUTINE_TASKS from "./defaultRoutineTasks";
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

/* ───────── helpers ───────── */
const createInitialState = (tasks) => {
  const base = {};
  tasks.forEach((_, i) => {
    base[i + 1] = false;          // 1-based
  });
  base.completedCount = 0;
  base.awardedSteps = [];
  return base;
};

/* ───────── component ───────── */
export default function RoutineList({ session }) {
  /* task list (configurable) */
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
        const snap = await getDoc(doc(db, "routines", uid));
        if (snap.exists()) {
          const d = snap.data();
          setTASKS(
            session === "morning"
              ? d.tasks_morning || DEFAULT_ROUTINE_TASKS.morning
              : d.tasks_afternoon || DEFAULT_ROUTINE_TASKS.afternoon
          );
        }
      } catch (e) {
        console.error("Load routine config", e);
      }
    })();
  }, [uid, session]);

  /* state */
  const initialState = useMemo(() => createInitialState(TASKS), [TASKS]);
  const [steps, setSteps] = useState(initialState);
  const [loading, setLoading] = useState(true);

  const today = getLocalDateKey();
  const docRef = uid && doc(db, "routines", uid, "daily", today);

  /* fetch daily */
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
          const exist = snap.data()[session];
          if (exist) {
            data = { ...initialState, ...exist };
            if (!data.awardedSteps) data.awardedSteps = [];
            if (JSON.stringify(exist) !== JSON.stringify(data)) {
              await updateDoc(docRef, {
                [session]: data,
                updatedAt: Timestamp.now(),
              });
            }
          } else {
            await updateDoc(docRef, {
              [session]: initialState,
              updatedAt: Timestamp.now(),
            });
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
      } catch (e) {
        if (e.code !== "permission-denied") console.error("Routine load", e);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [uid, docRef, initialState, session, today]);

  /* toggle */
  const toggleStep = async (idx) => {
    if (!uid) return;
    try {
      const userRef = doc(db, "users", uid);

      const updated = { ...steps };
      const newVal = !steps[idx];
      updated[idx] = newVal;
      updated.completedCount = TASKS.reduce(
        (acc, _, i) => acc + (updated[i + 1] ? 1 : 0),
        0
      );

      const awarded = updated.awardedSteps || [];
      if (newVal) {
        if (!awarded.includes(idx)) {
          await updateDoc(userRef, { points: increment(10) });
          updated.awardedSteps = [...awarded, idx];
          await updateDoc(docRef, {
            [`${session}.awardedSteps`]: arrayUnion(idx),
          });
        }
      } else if (awarded.includes(idx)) {
        await updateDoc(userRef, { points: increment(-10) });
        updated.awardedSteps = awarded.filter((n) => n !== idx);
        await updateDoc(docRef, {
          [`${session}.awardedSteps`]: arrayRemove(idx),
        });
      }

      setSteps(updated);
      await updateDoc(docRef, {
        [session]: updated,
        updatedAt: Timestamp.now(),
      });
    } catch (e) {
      console.error("Toggle step", e);
      setSteps(steps); // rollback
    }
  };

  /* render */
  if (!uid) return null;
  if (loading) return <Spinner animation="border" />;

  return (
    <div className="mb-4">
      <h5>
        {session === "morning" ? "🌅 등교 전 루틴" : "🌆 하교 후 루틴"}{" "}
        <Badge bg="secondary">
          {steps.completedCount} / {TASKS.length}
        </Badge>
      </h5>

      <ListGroup>
        {TASKS.map((label, i) => {
          const id = i + 1;                       // ← 1-based id 정의
          return (
            <ListGroup.Item
              key={id}
              action
              onClick={() => toggleStep(id)}
              className="d-flex align-items-center"
            >
              <Form.Check
                type="checkbox"
                checked={steps[id] || false}
                readOnly
                className="me-2"
                onChange={() => toggleStep(id)}
              />
              <span style={{ textDecoration: steps[id] ? "line-through" : "none" }}>
                {label}
              </span>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </div>
  );
}
