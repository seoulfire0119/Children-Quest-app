import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { db, auth, storage } from "../firebase";
import { Card, Button, Collapse, Form } from "react-bootstrap";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function QuestList() {
  const [quests, setQuests] = useState([]);
  const [openQuest, setOpenQuest] = useState(null);
  const [proofFiles, setProofFiles] = useState({});

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

  const completeQuest = async (quest) => {
    let proofUrl = quest.proofUrl || "";
    if (proofFiles[quest.id]) {
      try {
        const file = proofFiles[quest.id];
        const ext = file.name.split(".").pop() || "jpg";
        const storageRef = ref(
          storage,
          `proofs/${auth.currentUser.uid}/${quest.id}-${Date.now()}.${ext}`
        );
        await uploadBytes(storageRef, file);
        proofUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("upload quest proof", err);
      }
    }
    await updateDoc(doc(db, "quests", quest.id), {
      completed: true,
      revisionRequested: false,
      pointsAwarded: true,
      ...(proofUrl ? { proofUrl } : {}),
    });

    if (!quest.pointsAwarded && quest.points) {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        points: increment(quest.points),
      });
    }
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
              {typeof q.points === "number" && <p>포인트: {q.points}점</p>}
              {q.proofUrl && (
                <div className="mb-2">
                  <img
                    src={q.proofUrl}
                    alt=""
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                </div>
              )}
              <Form.Control
                type="file"
                accept="image/*,video/*"
                className="mb-2"
                onChange={(e) =>
                  setProofFiles({ ...proofFiles, [q.id]: e.target.files[0] })
                }
              />
              <Button variant="success" onClick={() => completeQuest(q)}>
                완료
              </Button>
            </Card.Body>
          </Collapse>
        </Card>
      ))}
    </>
  );
}
