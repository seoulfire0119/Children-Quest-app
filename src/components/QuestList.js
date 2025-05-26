import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Card, Button, Collapse } from "react-bootstrap";

export default function QuestList() {
  const [quests, setQuests] = useState([]);
  const [openQuest, setOpenQuest] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "quests"),
      where("assignedTo", "==", uid),
      where("completed", "==", false)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setQuests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("QuestList snapshot error:", err)
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeQuest = async (id) => {
    await updateDoc(doc(db, "quests", id), {
      completed: true,
      revisionRequested: false,
    });
  };

  if (!auth.currentUser) return null;

  return (
    <>
      {quests.length === 0 && <p>🎉 진행중인 퀘스트가 없습니다!</p>}
      {quests.map((q) => (
        <Card key={q.id} className="mb-2">
          <Card.Header
            onClick={() => setOpenQuest(openQuest === q.id ? null : q.id)}
            style={{ cursor: "pointer" }}
          >
            {q.title}
          </Card.Header>
          <Collapse in={openQuest === q.id}>
            <Card.Body>
              {q.photoUrl && (
                <img
                  src={q.photoUrl}
                  alt=""
                  style={{ width: "100%", borderRadius: 6 }}
                />
              )}
              <p>보상: {q.reward}</p>
              <Button variant="success" onClick={() => completeQuest(q.id)}>
                완료
              </Button>
            </Card.Body>
          </Collapse>
        </Card>
      ))}
    </>
  );
}
