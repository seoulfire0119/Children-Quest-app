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
  arrayUnion, // 'main' 브랜치에서 추가된 import 유지
  arrayRemove, // 'main' 브랜치에서 추가된 import 유지
} from "firebase/firestore";
import { ListGroup, Form, Badge, Spinner } from "react-bootstrap";

const createInitialState = (tasks) => {
  const obj = {};
  tasks.forEach((_, i) => {
    obj[i + 1] = false;
  });
  obj.completedCount = 0;
  obj.awardedSteps = []; // 'main' 브랜치에서 추가된 필드 유지
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

    const loadRoutineConfig = async () => {
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
    };

    loadRoutineConfig();
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

    const loadRoutineData = async () => {
      try {
        const snap = await getDoc(docRef);
        let data = initialState;

        if (snap.exists()) {
          const existing = snap.data()[session];
          if (existing) {
            // Merge existing data with initial state to handle structure changes
            data = { ...initialState, ...existing };

            // Ensure awardedSteps exists ('main' 브랜치 로직)
            if (!data.awardedSteps) {
              data.awardedSteps = [];
            }

            // Update if structure has changed
            if (JSON.stringify(existing) !== JSON.stringify(data)) {
              await updateDoc(docRef, {
                [session]: data,
                updatedAt: Timestamp.now(),
              });
            }
          } else {
            // Initialize session data
            await updateDoc(docRef, {
              [session]: initialState,
              updatedAt: Timestamp.now(),
            });
          }
        } else {
          // Create new document
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
    };

    loadRoutineData();

    return () => {
      isMounted = false;
    };
  }, [uid, docRef, initialState, session, today]);

  // 4) 단계 토글 핸들러 ('main' 브랜치의 중복 포인트 방지 로직 사용)
  const toggleStep = async (idx) => {
    if (!uid) return;

    try {
      const userRef = doc(db, "users", uid);

      // 새 상태 복제
      const updated = { ...steps };
      const newValue = !steps[idx];
      updated[idx] = newValue;

      // 완료 개수 계산
      const count = TASKS.reduce(
        (acc, _, i) => acc + (updated[i + 1] ? 1 : 0),
        0
      );
      updated.completedCount = count;

      // 포인트 증감 (중복 지급 방지)
      const awardedSteps = updated.awardedSteps || [];

      if (newValue) {
        // 체크하는 경우: 이미 포인트를 받지 않았다면 포인트 지급
        if (!awardedSteps.includes(idx)) {
          await updateDoc(userRef, { points: increment(10) }); // 'main'은 10 포인트
          updated.awardedSteps = [...awardedSteps, idx];

          // Firestore에 awardedSteps 업데이트
          await updateDoc(docRef, {
            [`${session}.awardedSteps`]: arrayUnion(idx),
          });
        }
      } else {
        // 체크 해제하는 경우: 포인트를 받았다면 포인트 차감
        if (awardedSteps.includes(idx)) {
          await updateDoc(userRef, { points: increment(-10) }); // 'main'은 10 포인트
          updated.awardedSteps = awardedSteps.filter((n) => n !== idx);

          // Firestore에서 awardedSteps 제거
          await updateDoc(docRef, {
            [`${session}.awardedSteps`]: arrayRemove(idx),
          });
        }
      }

      setSteps(updated);

      // 루틴 상태 업데이트 (awardedSteps 제외한 부분 업데이트)
      const { awardedSteps: _, ...rest } = updated; // awardedSteps는 이미 처리됨
      await updateDoc(docRef, {
          [session]: updated, // awardedSteps 포함 전체 업데이트 (arrayUnion/Remove 후 최종 상태)
          updatedAt: Timestamp.now(),
      });

    } catch (error) {
      console.error("Error toggling step:", error);
      // 에러 발생 시 상태 롤백 (원래 상태로)
      setSteps(steps); 
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
              checked={steps[i + 1] || false}
              onChange={() => toggleStep(i + 1)} // onChange는 유지하되, readOnly로 이중 실행 방지
              className="me-2"
              readOnly // 'main' 브랜치에서 추가된 readOnly 유지
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