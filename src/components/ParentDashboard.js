// src/components/ParentDashboard.js
import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Tab,
  Tabs,
  Spinner,
} from "react-bootstrap";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

import AddQuest from "./AddQuest";
import LinkChild from "./LinkChild";
import ParentQuestList from "./ParentQuestList";
import DeleteAccountButton from "./DeleteAccountButton";
import ChildSelector from "./ChildSelector";
import ChildRoutineStatus from "./ChildRoutineStatus";
import ChildPoints from "./ChildPoints";
import UsageRequests from "./UsageRequests";
import MarketAdmin from "./MarketAdmin";
import AfterSchoolAdmin from "./AfterSchoolAdmin";

export default function ParentDashboard() {
  /* ───────── 상태 ───────── */
  const [name, setName] = useState("");
  const [childrenUids, setChildrenUids] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [loading, setLoading] = useState(true);

  /* ───────── 사용자 정보 로드 ───────── */
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!snap.exists()) return;
      setName(snap.data().name || "");
      const list = snap.data().children || [];
      setChildrenUids([...new Set(list)]);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    /* flex-column + min-vh-100 → 회원탈퇴 버튼을 항상 맨아래로 밀어냄 */
    <Container className="p-3 d-flex flex-column min-vh-100">
      {/* ── 헤더 ───────────────────────────────────── */}
      <Row className="align-items-center mb-3">
        <Col>
          <h2 className="m-0">👨‍👩‍👧 부모 대시보드</h2>
          <small>
            <strong>로그인:</strong> {name} ({auth.currentUser.email})
          </small>
        </Col>

        {/* 오른쪽 상단 로그아웃 (파란색) */}
        <Col xs="auto">
          <Button
            size="sm"
            className="logout-btn" /* theme.css 에 정의 */
            onClick={async () => {
              await auth.signOut();
              window.location.reload();
            }}
          >
            로그아웃
          </Button>
        </Col>
      </Row>

      {/* ── 메인 탭 영역(가변 높이) ─────────────────── */}
      <div className="flex-grow-1">
        <Tabs defaultActiveKey="addQuest" className="parent-tabs mb-3">
          {/* 퀘스트 작성 */}
          <Tab eventKey="addQuest" title="퀘스트 작성">
            <ChildSelector
              childrenUids={childrenUids}
              selectedChild={selectedChild}
              onSelect={setSelectedChild}
            />
            <AddQuest selectedChild={selectedChild} />
          </Tab>

          {/* 아이 연동 */}
          <Tab eventKey="linkChild" title="아이 연동">
            <LinkChild />
          </Tab>

          {/* 내가 준 퀘스트 */}
          <Tab eventKey="parentQuestList" title="내가 준 퀘스트">
            <ParentQuestList />
          </Tab>

          {/* 자녀 루틴 현황 */}
          <Tab eventKey="routineStatus" title="자녀 루틴 현황">
            <ChildSelector
              childrenUids={childrenUids}
              selectedChild={selectedChild}
              onSelect={setSelectedChild}
            />
            {selectedChild && <ChildPoints childUid={selectedChild} />}

            {selectedChild ? (
              <ChildRoutineStatus childUid={selectedChild} />
            ) : (
              <p className="text-muted">아이를 선택해 주세요.</p>
            )}
          </Tab>

          {/* 사용 요청 보기 */}
          <Tab eventKey="usageReq" title="사용 요청 보기">
            <UsageRequests />
          </Tab>

          {/* 포인트마켓 관리 */}
          <Tab eventKey="marketAdmin" title="포인트마켓 관리">
            <MarketAdmin />
          </Tab>

          {/* 방과후 */}
          <Tab eventKey="afterSchool" title="방과후">
            <AfterSchoolAdmin />
          </Tab>
        </Tabs>
      </div>

      {/* ── 회원탈퇴 버튼(항상 맨아래) ───────────────── */}
      <Row className="justify-content-center mt-4">
        <Col xs="auto">
          <DeleteAccountButton />
        </Col>
      </Row>
    </Container>
  );
}
