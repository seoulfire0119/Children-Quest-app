import React from "react";
import { FaUserTie, FaChild } from "react-icons/fa";
import { Button, Card } from "react-bootstrap";

export default function RoleSelect({ onPick }) {
  const choose = async (picked) => {
    const kor = picked === "parent" ? "부모" : "아이";
    if (!window.confirm(`정말 "${kor}" 역할로 등록하시겠어요?`)) return;
    await onPick(picked); // 🔑 역할을 Firestore에 저장 + App.js 상태 업데이트
    /* navigate 없이도 App.js 의 role state 가 바뀌면서
       자동으로 Parent/Child 대시보드가 나타납니다! */
  };

  return (
    <Card
      className="p-4 text-center"
      style={{ maxWidth: 320, margin: "40px auto" }}
    >
      <h4 className="mb-3">역할을 선택하세요</h4>

      <Button
        variant="primary"
        className="w-100 mb-3 d-flex align-items-center justify-content-center"
        onClick={() => choose("parent")}
      >
        <FaUserTie className="me-2" /> 부모
      </Button>

      <Button
        variant="success"
        className="w-100 d-flex align-items-center justify-content-center"
        onClick={() => choose("child")}
      >
        <FaChild className="me-2" /> 아이
      </Button>
    </Card>
  );
}
