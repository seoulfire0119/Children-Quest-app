import React, { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc as getDocFirestore,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Form, Button, InputGroup, ListGroup } from "react-bootstrap";

export default function LinkChild() {
  const [name, setName] = useState("");
  const [result, setResult] = useState([]);

  const searchChild = async () => {
    const q = query(
      collection(db, "users"),
      where("name", "==", name),
      where("role", "==", "child")
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (list.length === 0) {
      return alert("🔍 해당 이름의 아이를 찾을 수 없습니다.");
    }

    // 각 아이별 이미 연동됐거나 요청중인지 체크
    const withStatus = await Promise.all(
      list.map(async (child) => {
        // ① 이미 연동된 아이인지 (users/{childId}.parents 배열)
        const userSnap = await getDocFirestore(doc(db, "users", child.id));
        const parents = userSnap.data().parents || [];
        const alreadyLinked = parents.includes(auth.currentUser.uid);

        // ② 이미 요청이 남아있는지 (linkReq/{childId})
        const reqSnap = await getDocFirestore(doc(db, "linkReq", child.id));
        const alreadyRequested =
          reqSnap.exists() &&
          reqSnap.data().parentUid === auth.currentUser.uid &&
          reqSnap.data().status === "pending";

        return { ...child, alreadyLinked, alreadyRequested };
      })
    );

    setResult(withStatus);
  };

  const requestLink = async (childUid) => {
    await setDoc(doc(db, "linkReq", childUid), {
      parentUid: auth.currentUser.uid,
      status: "pending",
    });
    setResult((prev) =>
      prev.map((c) =>
        c.id === childUid ? { ...c, alreadyRequested: true } : c
      )
    );
  };

  return (
    <>
      <InputGroup className="mb-3">
        <Form.Control
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="아이 이름"
        />
        <Button onClick={searchChild}>검색</Button>
      </InputGroup>

      <ListGroup>
        {result.map((child) => (
          <ListGroup.Item
            key={child.id}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              {child.name} ({child.email})
            </div>
            {child.alreadyLinked ? (
              <Button variant="outline-secondary" size="sm" disabled>
                이미 연동됨
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => requestLink(child.id)}
                disabled={child.alreadyRequested}
              >
                {child.alreadyRequested ? "요청중…" : "연동 요청"}
              </Button>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  );
}
