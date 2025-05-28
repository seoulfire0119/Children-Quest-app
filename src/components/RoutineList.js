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

const createInitialState = (tasks) => {
  const obj = {};
  tasks.forEach((_, i) => {
    obj[i + 1] = false;
  });
  obj.completedCount = 0;
  obj.awardedSteps = []; // Track which steps have been awarded points
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
            
            // Ensure awardedSteps exists
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

  // 4) 단계 토글 핸들러 (중복 포인트 지급 방지)
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
          await updateDoc(userRef, { points: increment(10) });
          updated.awardedSteps = [...awardedSteps, idx];
          
          // Firestore에 awardedSteps 업데이트
          await updateDoc(docRef, {
            [`${session}.awardedSteps`]: arrayUnion(idx),
          });
        }
      } else {
        // 체크 해제하는 경우: 포인트를 받았다면 포인트 차감
        if (awardedSteps.includes(idx)) {
          await updateDoc(userRef, { points: increment(-10) });
          updated.awardedSteps = awardedSteps.filter((n) => n !== idx);
          
          // Firestore에서 awardedSteps 제거
          await updateDoc(docRef, {
            [`${session}.awardedSteps`]: arrayRemove(idx),
          });
        }
      }
      
      setSteps(updated);

      // 루틴 상태 업데이트
      await updateDoc(docRef, {
        [session]: updated,
        updatedAt: Timestamp.now(),
      });
      
    } catch (error) {
      console.error("Error toggling step:", error);
      // 에러 발생 시 상태 롤백
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
              onChange={() => toggleStep(i + 1)}
              className="me-2"
              readOnly
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
