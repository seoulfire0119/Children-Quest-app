// src/App.js
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/App.css";
import "./styles/theme.css";
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import Login from "./components/Login";
import SignUp from "./components/SignUp";
import ParentDashboard from "./components/ParentDashboard";
import ChildDashboard from "./components/ChildDashboard";
import RoleSelect from "./components/RoleSelect";

export default function App() {
  const [signupView, setSignupView] = useState(false); // 로그인/회원가입 토글
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "parent" | "child" | "select" | null
  const [load, setLoad] = useState(true); // 최초 로딩 플래그

  // 로그인 상태 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // 로그인 X
        setUser(null);
        setRole(null);
        setLoad(false);
        return;
      }
      setUser(u);

      // users/{uid} 문서 조회
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setRole(snap.data().role);
      } else {
        // 아직 역할이 없으면 선택 화면 표시
        setRole("select");
      }
      setLoad(false);
    });
    return () => unsub();
  }, []);

  /* 로딩 중 */
  if (load) return <p className="p-4">로딩 중…</p>;

  /* 로그인 전 */
  if (!user)
    return signupView ? (
      <SignUp goLogin={() => setSignupView(false)} />
    ) : (
      <Login goSignUp={() => setSignupView(true)} />
    );

  /* 역할 선택 화면 */
  if (role === "select")
    return (
      <RoleSelect
        onPick={async (picked) => {
          try {
            // ① Firestore에 role / email / name 저장 (merge!)
            await setDoc(
              doc(db, "users", user.uid),
              {
                role: picked,
                email: user.email,
                name: user.displayName ?? "", // Google 계정 이름
              },
              { merge: true }
            );

            // ② 반드시 상태 변경!
            setRole(picked); // ← 이 줄이 있어야 화면 전환
          } catch (err) {
            alert("역할 저장 실패: " + err.message);
          }
        }}
      />
    );

  /* 로그인 후 라우팅 */
  return (
    <BrowserRouter>
      <Routes>
        {role === "parent" && (
          <>
            <Route path="/" element={<ParentDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {role === "child" && (
          <>
            <Route path="/" element={<ChildDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
