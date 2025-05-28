// src/components/PurchaseMarket.js
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
import { Card, Button, Spinner, Form, Collapse, Modal } from "react-bootstrap"; // 🔸 Modal 추가
import "../styles/PurchaseMarket.css";

export default function PurchaseMarket({ invOpen, setInvOpen }) {
  /* ───────── 상태 ───────── */
  const [inventory, setInventory] = useState([]);
  const [market, setMarket] = useState([]);
  const [parentOpts, setParentOpts] = useState([]);
  const [selectedParent, setSelectedParent] = useState({}); // txId → parentUid

  const [loading, setLoading] = useState(true);

  /* 🔸 모달용 상태 */
  const [parentModal, setParentModal] = useState(false); // 모달 on/off
  const [pendingTxId, setPendingTxId] = useState(null); // 어떤 아이템?

  /* ───────── 데이터 로드 ───────── */
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let unsubInv;
    (async () => {
      /* 1) 부모 옵션 */
      const uref = doc(db, "users", uid);
      const usnap = await getDoc(uref);
      const pids = usnap.data().parents || [];
      const opts = await Promise.all(
        pids.map(async (pu) => {
          const ps = await getDoc(doc(db, "users", pu));
          return { uid: pu, name: ps.exists() ? ps.data().name : "알 수 없음" };
        })
      );
      setParentOpts(opts);

      /* 2) 인벤토리(used=false) 실시간 구독 */
      const invQ = query(
        collection(db, "transactions", uid, "history"),
        where("used", "==", false)
      );
      unsubInv = onSnapshot(invQ, (snap) => {
        setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      /* 3) 마켓 목록 */
      const mSnap = await getDocs(collection(db, "marketplace"));
      setMarket(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setLoading(false);
    })();

    return () => unsubInv && unsubInv();
  }, []);

  /* ───────── 구매 로직 ───────── */
  const buy = async (item) => {
    // 1) 확인 팝업
    if (
      !window.confirm(`${item.name}을(를) ${item.price}점에 구매하시겠습니까?`)
    )
      return;

    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const pts = userSnap.data().points || 0;

    // 2) 포인트 부족
    if (pts < item.price) {
      alert("포인트가 부족합니다.");
      return;
    }

    try {
      // 3) 포인트 차감
      await updateDoc(userRef, { points: increment(-item.price) });

      // 4) 거래 내역 추가
      await addDoc(collection(db, "transactions", uid, "history"), {
        itemName: item.name,
        pointsSpent: item.price,
        used: false,
        date: Timestamp.now(),
      });

      alert("구매가 완료되었습니다!");
    } catch (err) {
      console.error(err);
      alert("구매 처리 중 오류가 발생했습니다.");
    }
  };

  /* ───────── 인벤토리 카드 클릭 → 모달 ───────── */
  const handleInvClick = (txId) => {
    if (!window.confirm("이 아이템을 사용하시겠습니까?")) return;
    setPendingTxId(txId);
    setParentModal(true);
  };

  /* ───────── 사용 요청(모달에서 호출) ───────── */
  const confirmUse = async () => {
    const uid = auth.currentUser.uid;
    const parentUid = selectedParent[pendingTxId];
    if (!parentUid) return alert("부모님을 선택해주세요.");

    const tx = inventory.find((i) => i.id === pendingTxId);
    const itemName = tx ? tx.itemName : "";

    await updateDoc(doc(db, "transactions", uid, "history", pendingTxId), {
      used: true,
    });
    await addDoc(collection(db, "usageRequests"), {
      parentUid,
      childUid: uid,
      transactionId: pendingTxId,
      itemName,
      date: Timestamp.now(),
      status: "pending",
    });

    setParentModal(false);
    alert("사용 요청이 전송되었습니다.");
  };

  /* ───────── 로딩 스피너 ───────── */
  if (loading)
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    );

  /* ───────── 뷰 ───────── */
  return (
    <>
      {/* ▣ 인벤토리 리스트 ▣ */}
      <Collapse in={invOpen}>
        <div className="inventory-list mb-4">
          {inventory.length === 0 && (
            <p className="text-center text-muted">
              보유 중인 아이템이 없습니다.
            </p>
          )}
          {inventory.map((tx) => (
            <Card
              key={tx.id}
              className="inventory-card mb-2"
              onClick={() => handleInvClick(tx.id)} /* 🔸 카드 클릭 */
              style={{ cursor: "pointer" }}
            >
              <Card.Body className="d-flex align-items-center p-2">
                <div className="item-name">{tx.itemName}</div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </Collapse>

      {/* ▣ 부모 선택 모달 ▣ */}
      <Modal centered show={parentModal} onHide={() => setParentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>부모님 선택</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Select
            value={selectedParent[pendingTxId] || ""}
            onChange={(e) =>
              setSelectedParent((prev) => ({
                ...prev,
                [pendingTxId]: e.target.value,
              }))
            }
          >
            <option value="">부모님</option>
            {parentOpts.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.name}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setParentModal(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={confirmUse}>
            사용하기
          </Button>
        </Modal.Footer>
      </Modal>

      <hr className="border-light opacity-50" />

      {/* ▣ 패밀리마켓 ▣ */}
      <h5
        className="mb-3 text-center"
        style={{
          color: "#A8FF60" /* 글자색 */,
          fontSize: "2rem" /* 폰트 크기 */,
          fontWeight: 700 /* 굵기(선택) */,
        }}
      >
        패밀리마켓
      </h5>
      <div className="market-grid">
        {market.map((item) => (
          <Card
            key={item.id}
            className="market-card text-center"
            onClick={() => buy(item)}
          >
            <Card.Body className="d-flex flex-column justify-content-center align-items-center p-3">
              <div className="item-name mb-1">{item.name}</div>
              <div className="item-price">{item.price}점</div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  );
}
