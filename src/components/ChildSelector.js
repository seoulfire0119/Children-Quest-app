// src/components/ChildSelector.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ChildSelector({
  childrenUids,
  selectedChild,
  onSelect,
}) {
  const [children, setChildren] = useState([]);

  useEffect(() => {
    const fetchChildren = async () => {
      const data = await Promise.all(
        childrenUids.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          return { uid, name: snap.exists() ? snap.data().name : "이름없음" };
        })
      );
      setChildren(data);
    };

    if (childrenUids.length > 0) fetchChildren();
  }, [childrenUids]);

  return (
    <select
      className="form-select mb-3"
      value={selectedChild}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">아이 선택</option>
      {children.map((child) => (
        <option key={child.uid} value={child.uid}>
          {child.name}
        </option>
      ))}
    </select>
  );
}
