import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { Card, Button, Spinner } from "react-bootstrap";

export default function UsageRequests() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "usageRequests"),
      where("parentUid", "==", uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const cSnap = await getDoc(doc(db, "users", data.childUid));
            const childName = cSnap.exists() ? cSnap.data().name : "알 수 없음";
            return {
              id: d.id,
              childUid: data.childUid,
              childName,
              itemName: data.itemName,
            };
          })
        );
        setReqs(list);
        setLoading(false);
      },
      (err) => {
        console.warn("UsageRequests snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = async (id, childUid, approve) => {
    const rRef = doc(db, "usageRequests", id);

    if (approve) {
      await updateDoc(rRef, { status: "approved" });
    } else {
      const rSnap = await getDoc(rRef);
      if (rSnap.exists()) {
        const txId = rSnap.data().transactionId;
        const txRef = doc(db, "transactions", childUid, "history", txId);
        await updateDoc(txRef, { used: false });
      }
      await deleteDoc(rRef);
    }
  };

  if (loading) return <Spinner animation="border" />;

  if (reqs.length === 0) {
    return <p>승인 대기중인 사용 요청이 없습니다.</p>;
  }

  return (
    <>
      {reqs.map((r) => (
        <Card key={r.id} className="mb-2 p-2">
          <div>
            <strong>{r.childName}</strong> – <em>{r.itemName}</em> 사용 요청
          </div>
          <div className="mt-2">
            <Button size="sm" onClick={() => handle(r.id, r.childUid, true)}>
              승인
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              className="ms-2"
              onClick={() => handle(r.id, r.childUid, false)}
            >
              거절
            </Button>
          </div>
        </Card>
      ))}
    </>
  );
}
