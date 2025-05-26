// src/components/LinkParent.js
import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Button, Card } from "react-bootstrap";

export default function LinkParent(props) {
  const [req, setReq] = useState(null);
  const [parentName, setParentName] = useState("");

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "linkReq", auth.currentUser.uid));
      if (snap.exists() && snap.data().status === "pending") {
        const parentUid = snap.data().parentUid;
        setReq({ parentUid });
        const pSnap = await getDoc(doc(db, "users", parentUid));
        if (pSnap.exists()) setParentName(pSnap.data().name);
      }
    })();
  }, []);

  const accept = async () => {
    const childRef = doc(db, "users", auth.currentUser.uid);
    const parentRef = doc(db, "users", req.parentUid);

    // 1) 자녀 문서에 parents 배열에 추가
    await updateDoc(childRef, {
      parents: arrayUnion(req.parentUid),
    });
    // 2) 부모 문서에 children 배열에 추가
    await updateDoc(parentRef, {
      children: arrayUnion(auth.currentUser.uid),
    });
    // 3) 요청 문서 삭제
    await deleteDoc(doc(db, "linkReq", auth.currentUser.uid));

    alert("✅ 부모 연동이 완료되었습니다!");
    window.location.reload();
  };

  const reject = async () => {
    // 요청 문서 삭제만 하면 충분합니다
    await deleteDoc(doc(db, "linkReq", auth.currentUser.uid));
    alert("❌ 부모 연동 요청이 거부되었습니다.");
    setReq(null);
  };

  if (!req) return null;
  return (
    <Card {...props}>
      <Card.Body className="d-flex justify-content-between align-items-center">
        💌 <strong>{parentName}</strong> 님이 연동을 요청했습니다.
        <div>
          <Button variant="primary" size="sm" onClick={accept} className="me-2">
            부모 등록하기
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={reject}>
            거절
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
