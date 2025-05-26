// src/components/DeleteAccountButton.js
import React from "react";
import { auth, db, storage } from "../firebase";
import {
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import {
  deleteUser,
  reauthenticateWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { ref, deleteObject, listAll } from "firebase/storage";
import { Button } from "react-bootstrap";

// Storage 전체 삭제 헬퍼
const deleteFolder = async (path) => {
  const folderRef = ref(storage, path);
  const { items, prefixes } = await listAll(folderRef);
  await Promise.all(items.map(deleteObject));
  await Promise.all(prefixes.map((p) => deleteFolder(p.fullPath)));
};

export default function DeleteAccountButton() {
  const handleDelete = async () => {
    if (!window.confirm("정말 탈퇴하시겠어요? 이 작업은 되돌릴 수 없습니다."))
      return;

    try {
      const user = auth.currentUser;
      const uid = user.uid;

      // 재인증 (Google 예시)
      if (user.providerData[0]?.providerId === "google.com") {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      // ① 본인 users 문서 삭제
      await deleteDoc(doc(db, "users", uid));

      // ② linkReq 문서 삭제
      await deleteDoc(doc(db, "linkReq", uid));

      // ③ quests 컬렉션에서 본인이 만든/or 받은 퀘스트 삭제
      const q1 = query(collection(db, "quests"), where("createdBy", "==", uid));
      const snap1 = await getDocs(q1);
      await Promise.all(
        snap1.docs.map((d) => deleteDoc(doc(db, "quests", d.id)))
      );
      const q2 = query(
        collection(db, "quests"),
        where("assignedTo", "==", uid)
      );
      const snap2 = await getDocs(q2);
      await Promise.all(
        snap2.docs.map((d) => deleteDoc(doc(db, "quests", d.id)))
      );

      // ④ **추가**: 부모가 탈퇴할 때
      //     children 배열에 포함된 모든 자녀 문서에서 parents 배열에서 제거
      const childQuery = query(
        collection(db, "users"),
        where("parents", "array-contains", uid)
      );
      const childSnap = await getDocs(childQuery);
      await Promise.all(
        childSnap.docs.map((d) =>
          updateDoc(doc(db, "users", d.id), { parents: arrayRemove(uid) })
        )
      );

      // ⑤ **추가**: 자녀가 탈퇴할 때
      //     children 배열에서 해당 자녀 제거
      const parentQuery = query(
        collection(db, "users"),
        where("children", "array-contains", uid)
      );
      const parentSnap = await getDocs(parentQuery);
      await Promise.all(
        parentSnap.docs.map((d) =>
          updateDoc(doc(db, "users", d.id), { children: arrayRemove(uid) })
        )
      );

      // ⑥ Storage 파일 삭제
      await deleteFolder(`questPhotos/${uid}`);
      await deleteFolder(`proofs/${uid}`);

      // ⑦ Auth 계정 삭제
      await deleteUser(user);

      alert("회원탈퇴가 완료되었습니다.");
      window.location.reload();
    } catch (err) {
      alert("탈퇴 실패: " + err.message);
    }
  };

  return (
    <Button variant="danger" onClick={handleDelete}>
      회원탈퇴
    </Button>
  );
}
