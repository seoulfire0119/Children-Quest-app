// src/components/SignUp.js
import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Form, Button, Card } from "react-bootstrap";

const provider = new GoogleAuthProvider();

export default function SignUp({ goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name) return alert("이름을 입력하세요");
    if (pw1 !== pw2) return alert("비밀번호가 일치하지 않습니다");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pw1);

      // Firebase Auth displayName 업데이트
      await updateProfile(cred.user, { displayName: name });

      // users 문서 저장 (role 은 선택 전 상태)
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        role: "select",
      });

      // 알림 없이 바로 로그인 화면으로 이동
      goLogin();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, provider);
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          name: cred.user.displayName ?? "",
          email: cred.user.email,
          role: "select",
        },
        { merge: true }
      );
      goLogin();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Card className="p-4 mx-auto" style={{ maxWidth: 400, marginTop: 40 }}>
      <h4 className="mb-3 text-center">회원가입</h4>
      <Form onSubmit={handleSignUp}>
        <Form.Control
          className="mb-2"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Form.Control
          type="email"
          className="mb-2"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Form.Control
          type="password"
          className="mb-2"
          placeholder="비밀번호"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
        />
        <Form.Control
          type="password"
          className="mb-3"
          placeholder="비밀번호 확인"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        <Button type="submit" className="w-100 mb-2">
          이메일로 가입하기
        </Button>
        <Button
          variant="outline-secondary"
          className="w-100 mb-2"
          onClick={handleGoogle}
        >
          Google 계정으로 가입하기
        </Button>
        <Button variant="link" className="w-100 mt-2" onClick={goLogin}>
          이미 계정이 있나요? 로그인
        </Button>
      </Form>
    </Card>
  );
}
