import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  Timestamp,
  query,
  where,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { Card, Button, Spinner, Form } from "react-bootstrap";

export default function PurchaseMarket() {
  const [inventory, setInventory] = useState([]);
  const [market, setMarket] = useState([]);
  const [parents, setParents] = useState([]);
  const [parentOpts, setParentOpts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubInv;
    (async () => {
      const uid = auth.currentUser.uid;
      const uref = doc(db, "users", uid);
      const usnap = await getDoc(uref);
      const pids = usnap.data().parents || [];
      setParents(pids);
      const opts = await Promise.all(
        pids.map(async (pu) => {
          const ps = await getDoc(doc(db, "users", pu));
          return { uid: pu, name: ps.exists() ? ps.data().name : "알 수 없음" };
        })
      );
      setParentOpts(opts);

      const invQuery = query(
        collection(db, "transactions", uid, "history"),
        where("used", "==", false)
      );
      unsubInv = onSnapshot(invQuery, (snap) => {
        setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      const mSnap = await getDocs(collection(db, "marketplace"));
      setMarket(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setLoading(false);
    })();
    return () => unsubInv && unsubInv();
  }, []);

  const buy = async (item) => {
    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const pts = userSnap.data().points || 0;
    if (pts < item.price) return alert("포인트 부족");
    await updateDoc(userRef, { points: increment(-item.price) });
    await addDoc(collection(db, "transactions", uid, "history"), {
      itemName: item.name,
      pointsSpent: item.price,
      used: false,
      date: Timestamp.now(),
    });
    alert("구매 완료");
  };

  const requestUse = async (tx, pid) => {
    if (!pid) return alert("부모님 선택해주세요");
    const uid = auth.currentUser.uid;
    const txRef = doc(db, "transactions", uid, "history", tx.id);
    await updateDoc(txRef, { used: true });
    await addDoc(collection(db, "usageRequests"), {
      parentUid: pid,
      childUid: uid,
      transactionId: tx.id,
      itemName: tx.itemName,
      date: Timestamp.now(),
      status: "pending",
    });
    alert("사용 요청 전송됨");
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <div>
      <h5>👜 내 인벤토리</h5>
      {inventory.length === 0 && <p>비어있음</p>}
      {inventory.map((tx) => (
        <Card key={tx.id} className="mb-2">
          <Card.Body className="d-flex align-items-center">
            <span className="me-auto">{tx.itemName}</span>
            <Form.Select
              size="sm"
              className="me-2"
              onChange={(e) => (tx.selParent = e.target.value)}
            >
              <option value="">부모님 선택</option>
              {parentOpts.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
            <Button size="sm" onClick={() => requestUse(tx, tx.selParent)}>
              사용하기
            </Button>
          </Card.Body>
        </Card>
      ))}

      <hr />

      <h5>🏬 패밀리 마켓</h5>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: "1rem",
        }}
      >
        {market.map((item) => (
          <Card
            key={item.id}
            className="p-2 text-center"
            style={{ aspectRatio: "1 / 1" }}
          >
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>{item.name}</div>
              <div>
                <strong>{item.price}점</strong>
              </div>
              <Button size="sm" onClick={() => buy(item)}>
                구매
              </Button>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
