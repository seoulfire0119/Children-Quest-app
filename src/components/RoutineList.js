import React, { useEffect, useState, useMemo } from "react";
import DEFAULT_ROUTINE_TASKS from "./defaultRoutineTasks";
import DEFAULT_ROUTINE_POINTS from "./defaultRoutinePoints";
import { auth, db, storage } from "../firebase";
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
import {
  Form,
  Badge,
  Spinner,
  Card,
  Collapse,
  Button,
  Image,
} from "react-bootstrap";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* ───────── helpers ───────── */
const createInitialState = (tasks) => {
  const base = {};
  tasks.forEach((_, i) => {
    base[i + 1] = false; // 1-based
  });
  base.completedCount = 0;
  base.awardedSteps = [];
  base.proofUrls = {};
  return base;
};

/* ───────── component ───────── */
export default function RoutineList({ session }) {
  /* task list (configurable) */
  const uid = auth.currentUser?.uid;
  const [TASKS, setTASKS] = useState(DEFAULT_ROUTINE_TASKS[session] || []);
  const [POINTS, setPOINTS] = useState(
    (DEFAULT_ROUTINE_TASKS[session] || []).map(
      () => DEFAULT_ROUTINE_POINTS[session] || 10
    )
  );
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "routines", uid));
        if (snap.exists()) {
          const d = snap.data();
          const tasks =
            d[`tasks_${session}`] || DEFAULT_ROUTINE_TASKS[session] || [];
          setTASKS(tasks);
          const pts = d[`points_${session}`];
          if (Array.isArray(pts)) {
            setPOINTS(pts);
          } else {
            setPOINTS(tasks.map(() => DEFAULT_ROUTINE_POINTS[session] || 10));
          }
        } else {
          const tasks = DEFAULT_ROUTINE_TASKS[session] || [];
          setTASKS(tasks);
          setPOINTS(tasks.map(() => DEFAULT_ROUTINE_POINTS[session] || 10));
        }
      } catch (e) {
        console.error("Load routine config", e);
      }
    })();
  }, [uid, session]);

  /* state */
  const initialState = useMemo(() => createInitialState(TASKS), [TASKS]);
  const [steps, setSteps] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [proofFiles, setProofFiles] = useState({});
  const [processing, setProcessing] = useState({});
  const [uploading, setUploading] = useState({});
  const today = getLocalDateKey();
  const docRef = uid && doc(db, "routines", uid, "daily", today);

  /* fetch daily */
  useEffect(() => {
    if (!uid || !docRef) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(docRef);
        let data = initialState;
        if (snap.exists()) {
          const exist = snap.data()[session];
          if (exist) {
            data = { ...initialState, ...exist };
            if (!data.awardedSteps) data.awardedSteps = [];
            if (!data.proofUrls) {
              data.proofUrls = {};
            } else {
              Object.keys(data.proofUrls).forEach((k) => {
                const v = data.proofUrls[k];
                data.proofUrls[k] = Array.isArray(v) ? v : v ? [v] : [];
              });
            }
            if (JSON.stringify(exist) !== JSON.stringify(data)) {
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
          const base = {
            morning: createInitialState(DEFAULT_ROUTINE_TASKS.morning),
            afternoon: createInitialState(DEFAULT_ROUTINE_TASKS.afternoon),
            vacation: createInitialState(DEFAULT_ROUTINE_TASKS.vacation),
            optional: createInitialState(DEFAULT_ROUTINE_TASKS.optional),
          };
          base[session] = initialState;
          await setDoc(
            docRef,
            { ...base, updatedAt: Timestamp.now() },
            { merge: true }
          );
        }
        mounted && setSteps(data);
      } catch (e) {
        if (e.code !== "permission-denied") console.error("Routine load", e);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [uid, docRef, initialState, session, today]);

  const uploadProof = async (idx) => {
    if (!uid || uploading[idx] || !proofFiles[idx]) return;
    setUploading((u) => ({ ...u, [idx]: true }));
    try {
      const file = proofFiles[idx];
      const ext = file.name.split(".").pop() || "jpg";
      const storageRef = ref(
        storage,
        `proofs/${uid}/routine-${session}-${today}-${idx}-${Date.now()}.${ext}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const proofUrls = { ...(steps.proofUrls || {}) };
      const arr = Array.isArray(proofUrls[idx]) ? [...proofUrls[idx]] : [];
      arr.push(url);
      proofUrls[idx] = arr.slice(0, 3);
      const updated = { ...steps, proofUrls };
      setSteps(updated);
      await updateDoc(docRef, {
        [`${session}.proofUrls`]: proofUrls,
        updatedAt: Timestamp.now(),
      });
      setProofFiles((p) => ({ ...p, [idx]: null }));
    } catch (err) {
      console.error("upload proof", err);
    } finally {
      setUploading((u) => ({ ...u, [idx]: false }));
    }
  };
  /* toggle */
  const toggleStep = async (idx) => {
    if (!uid || processing[idx]) return;
    setProcessing((p) => ({ ...p, [idx]: true }));

    try {
      const userRef = doc(db, "users", uid);

      const updated = { ...steps };
      const newVal = !steps[idx];
      updated[idx] = newVal;
      updated.completedCount = TASKS.reduce(
        (acc, _, i) => acc + (updated[i + 1] ? 1 : 0),
        0
      );

      const proofUrls = { ...(steps.proofUrls || {}) };
      if (!newVal) {
        delete proofUrls[idx];
      }
      updated.proofUrls = proofUrls;

      const awarded = updated.awardedSteps || [];
      const delta = POINTS[idx - 1] || DEFAULT_ROUTINE_POINTS[session] || 10;
      if (newVal) {
        if (!awarded.includes(idx)) {
          await updateDoc(userRef, { points: increment(delta) });
          updated.awardedSteps = [...awarded, idx];
          await updateDoc(docRef, {
            [`${session}.awardedSteps`]: arrayUnion(idx),
          });
        }
      } else if (awarded.includes(idx)) {
        await updateDoc(userRef, { points: increment(-delta) });
        updated.awardedSteps = awarded.filter((n) => n !== idx);
        await updateDoc(docRef, {
          [`${session}.awardedSteps`]: arrayRemove(idx),
        });
      }

      setSteps(updated);
      await updateDoc(docRef, {
        [session]: updated,
        updatedAt: Timestamp.now(),
      });
    } catch (e) {
      console.error("Toggle step", e);
      setSteps(steps); // rollback
    } finally {
      setProcessing((p) => ({ ...p, [idx]: false }));
    }
  };

  /* render */
  if (!uid) return null;
  if (loading) return <Spinner animation="border" />;

  const labels = {
    morning: "🌅 등교 전 루틴",
    afternoon: "🌆 하교 후 루틴",
    vacation: "🏖️ 방학 퀘스트",
    optional: "🎲 선택 퀘스트",
  };

  return (
    <div className="mb-4">
      <h5>
        {labels[session] || ""}{" "}
        <Badge bg="secondary">
          {steps.completedCount} / {TASKS.length}
        </Badge>
      </h5>

      {TASKS.map((label, i) => {
        const id = i + 1; // 1-based id
        const open = openId === id;
        const done = steps[id] || false;
        const proofList = Array.isArray(steps.proofUrls?.[id])
          ? steps.proofUrls[id]
          : [];
        return (
          <Card key={id} className="mb-2">
            <Card.Header
              onClick={() => setOpenId(open ? null : id)}
              style={{ cursor: "pointer" }}
              className="d-flex align-items-center"
            >
              <Form.Check
                type="checkbox"
                checked={done}
                readOnly
                className="me-2"
              />
              <span
                style={{
                  textDecoration: done ? "line-through" : "none",
                  flexGrow: 1,
                }}
              >
                {label}
              </span>
              <Badge bg="info" className="ms-2">
                {POINTS[i]}점
              </Badge>
            </Card.Header>
            <Collapse in={open}>
              <Card.Body>
                {proofList.map((url, idx2) => (
                  <div className="mb-2" key={idx2}>
                    {/\.mp4|\.mov|\.webm|\.ogg$/i.test(url) ? (
                      <video
                        src={url}
                        controls
                        style={{ width: "100%", borderRadius: 6 }}
                      />
                    ) : (
                      <Image src={url} fluid rounded />
                    )}
                  </div>
                ))}
                <Form.Label className="mb-1">증거물 업로드</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*,video/*"
                  className="mb-2"
                  onChange={(e) =>
                    setProofFiles({ ...proofFiles, [id]: e.target.files[0] })
                  }
                />
                <Button
                  variant="success"
                  className="me-2"
                  disabled={uploading[id] || proofList.length >= 3}
                  onClick={() => uploadProof(id)}
                >
                  업로드
                </Button>
                <Button
                  variant={done ? "secondary" : "success"}
                  disabled={processing[id]}
                  onClick={() => toggleStep(id)}
                >
                  {done ? "완료 취소" : "완료"}
                </Button>
              </Card.Body>
            </Collapse>
          </Card>
        );
      })}
    </div>
  );
}
