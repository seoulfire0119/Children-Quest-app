// src/components/Login.js
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { Form, Button, Card } from "react-bootstrap";

const provider = new GoogleAuthProvider();

export default function Login({ goSignUp }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, provider);
      /* users 문서 없으면 name/email 저장 */
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          name: cred.user.displayName ?? "", // ← 이름 저장
          email: cred.user.email,
          role: "select",
        },
        { merge: true } // 필드 병합
      );
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Card className="p-4 mx-auto" style={{ maxWidth: 400, marginTop: 40 }}>
      <h4 className="mb-3 text-center">로그인</h4>
      <Form onSubmit={handleLogin}>
        <Form.Control
          className="mb-2"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Form.Control
          className="mb-3"
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <Button type="submit" className="w-100">
          이메일 로그인
        </Button>
        <Button
          variant="outline-secondary"
          className="w-100 mt-2"
          onClick={handleGoogle}
        >
          Google로 로그인
        </Button>
        <Button variant="link" className="w-100 mt-2" onClick={goSignUp}>
          계정이 없나요? 회원가입
        </Button>
      </Form>
    </Card>
  );
}
