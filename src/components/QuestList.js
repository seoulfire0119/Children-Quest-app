import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db, auth, storage } from "../firebase";
import { Card, Button, Collapse, Form } from "react-bootstrap";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function QuestList() {
  const [quests, setQuests] = useState([]);
  const [openQuest, setOpenQuest] = useState(null);
  const [proofFiles, setProofFiles] = useState({});
  const [processing, setProcessing] = useState({});

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

  const uploadProof = async (quest) => {
    if (processing[quest.id] || !proofFiles[quest.id]) return;
    setProcessing((p) => ({ ...p, [quest.id]: true }));

    try {
      const file = proofFiles[quest.id];
      const ext = file.name.split(".").pop() || "jpg";
      const storageRef = ref(
        storage,
        `proofs/${auth.currentUser.uid}/${quest.id}-${Date.now()}.${ext}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const newCount = (quest.uploadCount || 0) + 1;

      await updateDoc(doc(db, "quests", quest.id), {
        proofUrls: arrayUnion(url),
        uploadCount: increment(1),
        revisionRequested: false,
        ...(newCount >= 3 ? { completed: true } : {}),
      });

      if (quest.points) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          points: increment(quest.points),
        });
        await updateDoc(doc(db, "quests", quest.id), {
          pointsAwardedCount: increment(1),
        });
      }

      setProofFiles((p) => ({ ...p, [quest.id]: null }));
    } catch (error) {
      console.error("Quest proof upload error:", error);
    } finally {
      setProcessing((p) => ({ ...p, [quest.id]: false }));
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
              {q.photoUrl &&
                (/\.mp4|\.mov|\.webm|\.ogg$/i.test(q.photoUrl) ? (
                  <video
                    src={q.photoUrl}
                    controls
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                ) : (
                  <img
                    src={q.photoUrl}
                    alt=""
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                ))}
              {typeof q.points === "number" && <p>포인트: {q.points}점</p>}
              {Array.isArray(q.proofUrls) &&
                q.proofUrls.map((url, idx) => (
                  <div className="mb-2" key={idx}>
                    {/\.mp4|\.mov|\.webm|\.ogg$/i.test(url) ? (
                      <video
                        src={url}
                        controls
                        style={{ width: "100%", borderRadius: 6 }}
                      />
                    ) : (
                      <img
                        src={url}
                        alt=""
                        style={{ width: "100%", borderRadius: 6 }}
                      />
                    )}
                  </div>
                ))}
              <Form.Label className="mb-1">증거물 업로드</Form.Label>
              <Form.Control
                type="file"
                accept="image/*,video/*"
                className="mb-2"
                onChange={(e) =>
                  setProofFiles({ ...proofFiles, [q.id]: e.target.files[0] })
                }
              />
              <Button
                variant="success"
                disabled={processing[q.id] || (q.uploadCount || 0) >= 3}
                onClick={() => uploadProof(q)}
              >
                업로드
              </Button>
            </Card.Body>
          </Collapse>
        </Card>
      ))}
    </>
  );
}
