import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase";
import { Form, Button } from "react-bootstrap";

export default function AddQuest({ selectedChild }) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [photo, setPhoto] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title) return alert("제목을 입력하세요!");
    if (!selectedChild) return alert("퀘스트를 받을 아이를 선택하세요!");

    const pts = Number(points);
    if (!Number.isFinite(pts) || pts <= 0) return alert("포인트를 입력하세요!");

    let photoUrl = "";
    if (photo) {
      const storageRef = ref(
        storage,
        `questPhotos/${auth.currentUser.uid}/${Date.now()}.jpg`
      );
      await uploadBytes(storageRef, photo);
      photoUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "quests"), {
      title,
      points: pts,
      photoUrl,
      createdBy: auth.currentUser.uid,
      assignedTo: selectedChild,
      createdAt: Timestamp.now(),
      completed: false,
      revisionRequested: false,
      pointsAwardedCount: 0,
      uploadCount: 0,
      proofUrls: [],
    });

    setTitle("");
    setPoints("");
    setPhoto(null);
    alert("퀘스트가 생성되었습니다!");
  };

  return (
    <Form onSubmit={handleAdd} className="my-3">
      <Form.Control
        type="text"
        className="mb-2"
        placeholder="퀘스트 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Form.Control
        type="number"
        className="mb-2"
        placeholder="원하시는 포인트 점수를 적어주세요"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
      />
      <Form.Control
        type="file"
        accept="image/*"
        className="mb-3"
        onChange={(e) => setPhoto(e.target.files[0])}
      />
      <Button type="submit">추가</Button>
    </Form>
  );
}
