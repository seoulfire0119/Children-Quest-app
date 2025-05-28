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
} from "firebase/firestore";
import { ListGroup, Form, Badge, Spinner } from "react-bootstrap";

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
  // 1) 할 일 목록 (Firestore에서 사용자 정의 가능)
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
        const configSnap = await getDoc(doc(db, "routines", uid));
        if (configSnap.exists()) {
          const data = configSnap.data();
          setTASKS(
            session === "morning"
              ? data.tasks_morning || DEFAULT_ROUTINE_TASKS.morning
              : data.tasks_afternoon || DEFAULT_ROUTINE_TASKS.afternoon
          );
        }
      } catch (err) {
        console.error("Load routine config error:", err);
      }
    })();
  }, [uid, session]);

  // 2) 초기 상태
  const initialState = useMemo(() => createInitialState(TASKS), [TASKS]);

  const [steps, setSteps] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const today = getLocalDateKey();
  const docRef = uid && doc(db, "routines", uid, "daily", today);

  // 3) Firestore에서 상태 로드
  useEffect(() => {
    if (!uid || !docRef) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        let data = initialState;
        if (snap.exists()) {
          const existing = snap.data()[session];
          if (existing) {
            data = { ...initialState, ...existing };
            if (JSON.stringify(existing) !== JSON.stringify(data)) {
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
        if (isMounted) setSteps(data);
      } catch (err) {
        if (err.code !== "permission-denied") {
          console.error("Routine load error:", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [uid, docRef, initialState, session, today]);

  // 4) 단계 토글 핸들러
  const toggleStep = async (idx) => {
    if (!uid) return;

    // 새 상태 복제
    const updated = { ...steps, awardedSteps: [...steps.awardedSteps] };
    updated[idx] = !updated[idx];
    // 완료 개수 계산
    const count = TASKS.reduce(
      (acc, _, i) => acc + (updated[i + 1] ? 1 : 0),
      0
    );
    updated.completedCount = count;
    setSteps(updated);

    // Firestore 저장
    await updateDoc(docRef, {
      [session]: updated,
      updatedAt: Timestamp.now(),
    });

    // 포인트 지급 (첫 체크 시 한 번만)
    if (updated[idx] && !steps.awardedSteps.includes(idx)) {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { points: increment(10) });
      updated.awardedSteps.push(idx);
      setSteps({ ...updated });
      await updateDoc(docRef, {
        [`${session}.awardedSteps`]: arrayUnion(idx),
      });
    }
  };

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
        {TASKS.map((label, i) => (
          <ListGroup.Item
            key={i}
            action
            onClick={() => toggleStep(i + 1)}
            className="d-flex align-items-center"
          >
            <Form.Check
              type="checkbox"
              checked={steps[i + 1]}
              onChange={() => toggleStep(i + 1)}
              className="me-2"
            />
            <span
              style={{
                textDecoration: steps[i + 1] ? "line-through" : "none",
              }}
            >
              {label}
            </span>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
}
