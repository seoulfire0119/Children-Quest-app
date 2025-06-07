// src/components/ParentQuestList.js
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Accordion, Button, Badge, Image } from "react-bootstrap";

export default function ParentQuestList() {
  const [quests, setQuests] = useState([]);
  
  useEffect(() => {
    const q = query(
      collection(db, "quests"),
      where("createdBy", "==", auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const data = await Promise.all(
        snap.docs.map(async (d) => {
          const q = { id: d.id, ...d.data() };
          // 자녀 이름 조회
          const childSnap = await getDoc(doc(db, "users", q.assignedTo));
          q.childName = childSnap.exists()
            ? childSnap.data().name
            : "알 수 없음";
          return q;
        })
      );
      setQuests(data);
    });
    return unsub;
  }, []);

  const requestRevision = async (id) => {
    await updateDoc(doc(db, "quests", id), {
      completed: false,
      revisionRequested: true,
    });
  };

  const getStatus = (q) =>
    q.revisionRequested
      ? { text: "보완요청", variant: "danger" }
      : q.completed
      ? { text: "완료", variant: "success" }
      : { text: "진행중", variant: "warning" };

  if (!quests.length) return <p>📌 내가 준 퀘스트가 없습니다.</p>;

  return (
    <Accordion>
      {quests.map((q) => {
        const status = getStatus(q);
        return (
          <Accordion.Item eventKey={q.id} key={q.id}>
            <Accordion.Header>
              {q.childName} : {q.title}
              <Badge bg={status.variant} className="ms-2">
                {status.text}
              </Badge>
            </Accordion.Header>
            <Accordion.Body>
              {q.photoUrl && (
                <>
                  <h6>원본 사진</h6>
                  <Image src={q.photoUrl} fluid rounded className="mb-3" />
                </>
              )}
              {q.proofUrl && (
                <>
                  <h6>제출된 증빙 사진</h6>
                  <Image src={q.proofUrl} fluid rounded className="mb-3" />
                </>
              )}
              {typeof q.points === "number" && (
                <p>포인트: {q.points}점</p>
              )}
              {q.completed && !q.revisionRequested && (
                <Button
                  variant="outline-danger"
                  onClick={() => requestRevision(q.id)}
                >
                  📝 수정보완 요청하기
                </Button>
              )}
            </Accordion.Body>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}