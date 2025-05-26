// useFirestoreQuery.js (커스텀 훅)
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function useFirestoreQuery(col, conditions) {
  const [data, setData] = useState([]);
  useEffect(() => {
    const q = query(collection(db, col), ...conditions.map((c) => where(...c)));
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [col, JSON.stringify(conditions)]);
  return data;
}
