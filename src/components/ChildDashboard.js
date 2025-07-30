import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Container, Button, Tab, Tabs, Row, Col } from "react-bootstrap";
import LinkParent from "./LinkParent";
import pkg from "../../package.json";
import QuestList from "./QuestList";
import CompletedQuestList from "./CompletedQuestList";
import RoutineList from "./RoutineList";
import PurchaseMarket from "./PurchaseMarket";
import ChildPoints from "./ChildPoints";
import AfterSchoolSchedule from "./AfterSchoolSchedule";
import DEFAULT_ROUTINE_USAGE from "./defaultRoutineUsage";
import "../styles/PurchaseMarket.css";

const APP_VERSION = pkg.version;

export default function ChildDashboard() {
  /* ──────────────── 상태 ──────────────── */
  const [parents, setParents] = useState([]);
  const [myName, setMyName] = useState("");
  const [reqExists, setReqExists] = useState(false);
  const [showMarket, setShowMarket] = useState(false); // 마켓 뷰 토글
  const [invOpen, setInvOpen] = useState(false); // 인벤토리 토글
  const [useFlags, setUseFlags] = useState(DEFAULT_ROUTINE_USAGE);

  /* ──────────────── 초기 데이터 로드 ──────────────── */
  useEffect(() => {
    (async () => {
      const uref = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(uref);
      if (!snap.exists()) return;
      const data = snap.data();
      setMyName(data.name || "");

      const parentUids = Array.isArray(data.parents) ? data.parents : [];
      const names = await Promise.all(
        parentUids.map(async (uid) => {
          const ps = await getDoc(doc(db, "users", uid));
          return ps.exists() ? ps.data().name : "알 수 없음";
        })
      );
      setParents(names);

      const rqSnap = await getDoc(doc(db, "linkReq", auth.currentUser.uid));
      setReqExists(rqSnap.exists() && rqSnap.data().status === "pending");

      try {
        const routineSnap = await getDoc(
          doc(db, "routines", auth.currentUser.uid)
        );
        if (routineSnap.exists()) {
          const r = routineSnap.data();
          setUseFlags({
            morning:
              r.use_morning !== undefined
                ? r.use_morning
                : DEFAULT_ROUTINE_USAGE.morning,
            afternoon:
              r.use_afternoon !== undefined
                ? r.use_afternoon
                : DEFAULT_ROUTINE_USAGE.afternoon,
            vacation:
              r.use_vacation !== undefined
                ? r.use_vacation
                : DEFAULT_ROUTINE_USAGE.vacation,
            optional:
              r.use_optional !== undefined
                ? r.use_optional
                : DEFAULT_ROUTINE_USAGE.optional,
          });
        }
      } catch (e) {
        console.error("load routine usage", e);
      }
    })();
  }, []);

  /* ──────────────── 렌더 ──────────────── */
  return (
    <Container className="p-3">
      <div className="dashboard-wrap">
        {/* 헤더 */}
        <Row className="align-items-center mb-3">
          <Col xs={8} sm={10}>
            <h1 className="text-warning">👶 아이 대시보드 v{APP_VERSION}</h1>
          </Col>
          <Col xs={4} sm={2} className="text-end">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={async () => {
                await auth.signOut();
                window.location.reload();
              }}
            >
              로그아웃
            </Button>
          </Col>
        </Row>

        {/* 사용자 정보 */}
        <Row>
          <Col>
            <div className="section-card text-center mb-3">
              <p className="fs-5 fw-semibold">
                <strong>{myName}</strong> ({auth.currentUser.email})
              </p>
              <p className="fs-5">
                👨‍👩‍👧‍👦 <strong>내 부모님:</strong>{" "}
                {parents.length ? parents.join(", ") : "연동 없음"}
              </p>
            </div>
          </Col>
        </Row>

        {/* 포인트 */}
        <Row className="mb-3">
          <Col>
            <div className="section-card text-center">
              <ChildPoints childUid={auth.currentUser.uid} />
            </div>
          </Col>
        </Row>

        {/* 부모 연결 요청 알림 */}
        {reqExists && <LinkParent className="mb-3" />}

        {/* ────── 1. 포인트 마켓 배너형 탭 ────── */}
        <Tabs
          id="market-tab"
          activeKey={showMarket ? "market" : "closed"}
          onSelect={(key) => setShowMarket(key === "market")}
          className="mb-3 single-tab"
        >
          <Tab
            eventKey="market"
            title="🛒 포인트 마켓"
            mountOnEnter
            unmountOnExit
          >
            <div className="d-flex gap-2 mb-3">
              <Button
                variant="warning"
                className="inventory-toggle flex-grow-1"
                onClick={() => setInvOpen(!invOpen)}
              >
                <span role="img" aria-label="chest" className="me-1">
                  📦
                </span>
                {invOpen ? "인벤토리 접기" : "내 인벤토리 펼치기"}
              </Button>
              <Button
                variant="secondary"
                className="flex-grow-1"
                onClick={() => setShowMarket(false)}
              >
                포인트마켓 접기
              </Button>
            </div>

            <PurchaseMarket invOpen={invOpen} setInvOpen={setInvOpen} />
          </Tab>
          <Tab eventKey="closed" title="🛒 포인트 마켓 (닫힘)" />
        </Tabs>

        {/* ────── 2. 퀘스트 & 루틴 탭 ────── */}
        {!showMarket && (
          <Tabs defaultActiveKey="ongoing" className="mb-3 two-row-tabs">
            <Tab eventKey="ongoing" title="🏃 진행중 퀘스트">
              <QuestList />
            </Tab>
            <Tab eventKey="completed" title="✅ 완료한 퀘스트">
              <CompletedQuestList />
            </Tab>
            {useFlags.morning && (
              <Tab eventKey="morning" title="🌅 등교 전">
                <RoutineList session="morning" />
              </Tab>
            )}
            {useFlags.afternoon && (
              <Tab eventKey="afternoon" title="🌆 하교 후">
                <RoutineList session="afternoon" />
              </Tab>
            )}
            {useFlags.vacation && (
              <Tab eventKey="vacation" title="🏖️ 방학 퀘스트">
                <RoutineList session="vacation" />
              </Tab>
            )}
            {useFlags.optional && (
              <Tab eventKey="optional" title="🎲 방학숙제">
                <RoutineList session="optional" />
              </Tab>
            )}
            <Tab eventKey="afterSchool" title="방과후 시간표">
              <AfterSchoolSchedule />
            </Tab>
          </Tabs>
        )}
      </div>
    </Container>
  );
}
