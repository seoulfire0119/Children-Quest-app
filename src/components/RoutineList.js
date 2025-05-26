import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
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

export default function RoutineList({ session }) {
  // 1) 할 일 목록
  const TASKS = useMemo(() => {
    return session === "morning"
      ? [
          "1) 일어나자마자 양치하기",
          "2) 양치하고 옷 갈아입기",
          "3) 머리정돈 & 선크림",
          "4) 물통 챙기기",
          "5) 방과후 준비물 챙기기 (배드민턴, 태권도)",
          "6) 핸드폰 챙기기",
          "7) 티비 보기",
          "8) 밥(약)먹기",
          "9) 시간 확인하기",
          "10) 학교가기",
        ]
      : [
          "1) 손씻기",
          "2) 물통 싱크대에 넣기",
          "3) 샤워하기",
          "4) 벗은 옷 빨래통에 넣기",
          "5) 독서하기",
          "6) 독서록 작성하기",
          "7) 뽀뽀하기",
          "8) 안마하기",
          "9) 학교 이야기해주기",
          "10) 부모님 도와드리기",
        ];
  }, [session]);

  // 2) 초기 상태
  const initialState = useMemo(() => {
    const obj = {};
    TASKS.forEach((_, i) => {
      obj[i + 1] = false;
    });
    obj.completedCount = 0;
    obj.awardedSteps = [];
    return obj;
  }, [TASKS]);

  const [steps, setSteps] = useState(initialState);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid;
  const today = new Date().toISOString().split("T")[0];
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
        if (snap.exists()) {
          const data = snap.data()[session] || initialState;
          if (isMounted) setSteps(data);
        } else {
          // 문서가 없으면 생성
          await setDoc(
            doc(db, "routines", uid, "daily", today),
            {
              morning: initialState,
              afternoon: initialState,
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );
        }
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
    // 선행 단계가 완료되지 않으면 중지
    if (idx > 1 && !steps[idx - 1]) return;

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
            disabled={i > 0 && !steps[i]}
            className="d-flex align-items-center"
            style={{
              cursor: i === 0 || steps[i] ? "pointer" : "not-allowed",
              opacity: i === 0 || steps[i] ? 1 : 0.5,
            }}
          >
            <Form.Check
              type="checkbox"
              checked={steps[i + 1]}
              onChange={() => toggleStep(i + 1)}
              className="me-2"
              disabled={i > 0 && !steps[i]}
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
