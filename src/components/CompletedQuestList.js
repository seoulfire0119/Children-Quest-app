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
import { Card, Button, Collapse } from "react-bootstrap";

export default function CompletedQuestList() {
  const [quests, setQuests] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "quests"),
      where("assignedTo", "==", uid),
      where("completed", "==", true)
    );
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const data = await Promise.all(
          snap.docs.map(async (d) => {
            const questData = { id: d.id, ...d.data() };
            const childSnap = await getDoc(
              doc(db, "users", questData.assignedTo)
            );
            questData.childName = childSnap.exists()
              ? childSnap.data().name
              : "알 수 없음";
            return questData;
          })
        );
        setQuests(data);
      },
      (err) => console.warn("CompletedQuestList snapshot error:", err)
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restore = async (id) => {
    await updateDoc(doc(db, "quests", id), { completed: false });
  };

  if (!auth.currentUser) return null;
  if (quests.length === 0) return <p>✅ 완료한 퀘스트가 없습니다!</p>;

  return (
    <>
      {quests.map((q) => (
        <Card key={q.id} className="mb-2">
          <Card.Header
            onClick={() => setOpenId(openId === q.id ? null : q.id)}
            style={{ cursor: "pointer" }}
          >
            {q.title}
          </Card.Header>
          <Collapse in={openId === q.id}>
            <Card.Body>
              {q.photoUrl && (
                <>
                  <h6>원본 사진</h6>
                  <img
                    src={q.photoUrl}
                    alt=""
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                </>
              )}
              {q.proofUrl && (
                <>
                  <h6 className="mt-3">내가 제출한 증빙 사진</h6>
                  <img
                    src={q.proofUrl}
                    alt=""
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                </>
              )}
              {typeof q.points === "number" && (
                <p className="mt-2">획득 포인트: {q.points}점</p>
              )}
              <Button
                variant="outline-secondary"
                className="mt-3"
                onClick={() => restore(q.id)}
              >
                ❌ 진행중으로 되돌리기
              </Button>
            </Card.Body>
          </Collapse>
        </Card>
      ))}
    </>
  );
}
