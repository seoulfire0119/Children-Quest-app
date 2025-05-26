import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Card, Spinner } from "react-bootstrap";

export default function ChildPoints({ childUid }) {
  const [points, setPoints] = useState(null);

  useEffect(() => {
    if (!childUid) return;
    const ref = doc(db, "users", childUid);
    const unsub = onSnapshot(ref, (snap) => {
      setPoints(snap.exists() ? snap.data().points : 0);
    });
    return () => unsub();
  }, [childUid]);

  if (points === null) return <Spinner animation="border" size="sm" />;

  return (
    <Card
      className="ection-card text-center mb-3"
      style={{ fontSize: "2.4rem", fontWeight: 400 }}
    >
      보유한 포인트 <strong>{points} 점</strong>
    </Card>
  );
}
