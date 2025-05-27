import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Form, Button, Table } from "react-bootstrap";

export default function MarketAdmin() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const loadItems = async () => {
    const snap = await getDocs(collection(db, "marketplace"));
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!name || !price) return;
    const p = parseInt(price, 10);
    if (isNaN(p)) return alert("가격을 숫자로 입력하세요.");
    await addDoc(collection(db, "marketplace"), { name, price: p });
    setName("");
    setPrice("");
    loadItems();
  };

  const editItem = async (item) => {
    const newName = window.prompt("상품명", item.name);
    if (newName === null) return;
    const newPriceStr = window.prompt("가격", item.price);
    if (newPriceStr === null) return;
    const newPrice = parseInt(newPriceStr, 10);
    if (isNaN(newPrice)) return alert("가격을 숫자로 입력하세요.");
    await updateDoc(doc(db, "marketplace", item.id), {
      name: newName,
      price: newPrice,
    });
    loadItems();
  };

  const removeItem = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "marketplace", id));
    loadItems();
  };

  return (
    <div>
      <Form onSubmit={addItem} className="mb-3 d-flex gap-2">
        <Form.Control
          placeholder="상품명"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Form.Control
          placeholder="가격"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ maxWidth: "6rem" }}
        />
        <Button type="submit">추가</Button>
      </Form>

      <Table bordered className="text-center">
        <thead>
          <tr>
            <th>상품</th>
            <th>가격</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.price}</td>
              <td>
                <Button
                  size="sm"
                  className="me-2"
                  onClick={() => editItem(item)}
                >
                  수정
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeItem(item.id)}
                >
                  삭제
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
