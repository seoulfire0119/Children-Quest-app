import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Card, Badge, ListGroup, Spinner } from "react-bootstrap";

export default function ChildRoutineStatus({ childUid }) {
  const [routine, setRoutine] = useState({ morning: {}, afternoon: {} });
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!childUid) {
      setRoutine({ morning: {}, afternoon: {} });
      setLoading(false);
      return;
    }

    const fetchRoutine = async () => {
      setLoading(true);
      const docRef = doc(db, "routines", childUid, "daily", today);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setRoutine(snap.data());
      } else {
        setRoutine({ morning: {}, afternoon: {} });
      }
      setLoading(false);
    };

    fetchRoutine();
  }, [childUid, today]);

  const TASKS = {
    morning: [
      "일어나자마자 양치하기",
      "양치하고 옷 갈아입기",
      "머리정돈 & 선크림",
      "물통 챙기기",
      "방과후 준비물 챙기기 (배드민턴, 태권도)",
      "핸드폰 챙기기",
      "티비 보기",
      "밥(약)먹기",
      "시간 확인하기",
      "학교가기",
    ],
    afternoon: [
      "손씻기",
      "물통 싱크대에 넣기",
      "샤워하기",
      "벗은 옷 빨래통에 넣기",
      "독서하기",
      "독서록 작성하기",
      "뽀뽀하기",
      "안마하기",
      "학교 이야기해주기",
      "부모님 도와드리기",
    ],
  };

  if (loading) return <Spinner animation="border" />;

  const renderTasks = (session) =>
    TASKS[session].map((task, index) => {
      const completed = routine[session][index + 1];
      return (
        <ListGroup.Item key={index}>
          {completed ? "✅" : "❌"} {task}
        </ListGroup.Item>
      );
    });

  return (
    <div>
      <Card className="mb-3">
        <Card.Header>
          🌅 등교 전 루틴{" "}
          <Badge bg="secondary">
            완료 {routine.morning.completedCount || 0}/{TASKS.morning.length}
          </Badge>
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("morning")}</ListGroup>
      </Card>

      <Card>
        <Card.Header>
          🌆 하교 후 루틴{" "}
          <Badge bg="secondary">
            완료 {routine.afternoon.completedCount || 0}/
            {TASKS.afternoon.length}
          </Badge>
        </Card.Header>
        <ListGroup variant="flush">{renderTasks("afternoon")}</ListGroup>
      </Card>
    </div>
  );
}
