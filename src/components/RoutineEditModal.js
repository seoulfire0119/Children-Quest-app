import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import DEFAULT_ROUTINE_POINTS from "./defaultRoutinePoints";

export default function RoutineEditModal({ show, onHide, config, onSave }) {
  const [morningText, setMorningText] = useState("");
  const [afternoonText, setAfternoonText] = useState("");
  const [vacationText, setVacationText] = useState("");
  const [optionalText, setOptionalText] = useState("");

  const [morningBase, setMorningBase] = useState(
    DEFAULT_ROUTINE_POINTS.morning
  );
  const [afternoonBase, setAfternoonBase] = useState(
    DEFAULT_ROUTINE_POINTS.afternoon
  );
  const [vacationBase, setVacationBase] = useState(
    DEFAULT_ROUTINE_POINTS.vacation
  );
  const [optionalBase, setOptionalBase] = useState(
    DEFAULT_ROUTINE_POINTS.optional
  );

  const [morningPointsText, setMorningPointsText] = useState("");
  const [afternoonPointsText, setAfternoonPointsText] = useState("");
  const [vacationPointsText, setVacationPointsText] = useState("");
  const [optionalPointsText, setOptionalPointsText] = useState("");

  const [useMorning, setUseMorning] = useState(true);
  const [useAfternoon, setUseAfternoon] = useState(true);
  const [useVacation, setUseVacation] = useState(true);
  const [useOptional, setUseOptional] = useState(true);
  useEffect(() => {
    setMorningText((config.morning || []).join("\n"));
    setAfternoonText((config.afternoon || []).join("\n"));
    setVacationText((config.vacation || []).join("\n"));
    setOptionalText((config.optional || []).join("\n"));
    setMorningPointsText((config.pointsMorning || []).join("\n"));
    setAfternoonPointsText((config.pointsAfternoon || []).join("\n"));
    setVacationPointsText((config.pointsVacation || []).join("\n"));
    setOptionalPointsText((config.pointsOptional || []).join("\n"));
    if (config.pointsMorningBase) setMorningBase(config.pointsMorningBase);
    if (config.pointsAfternoonBase)
      setAfternoonBase(config.pointsAfternoonBase);
    if (config.pointsVacationBase) setVacationBase(config.pointsVacationBase);
    if (config.pointsOptionalBase) setOptionalBase(config.pointsOptionalBase);
    setUseMorning(config.useMorning !== false);
    setUseAfternoon(config.useAfternoon !== false);
    setUseVacation(config.useVacation !== false);
    setUseOptional(config.useOptional !== false);
  }, [config]);

  const handleSave = () => {
    const morning = morningText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const morningPoints = morningPointsText
      .split("\n")
      .map((t) => parseInt(t.trim(), 10));
    const afternoon = afternoonText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const afternoonPoints = afternoonPointsText
      .split("\n")
      .map((t) => parseInt(t.trim(), 10));
    const vacation = vacationText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const vacationPoints = vacationPointsText
      .split("\n")
      .map((t) => parseInt(t.trim(), 10));
    const optional = optionalText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const optionalPoints = optionalPointsText
      .split("\n")
      .map((t) => parseInt(t.trim(), 10));

    const fillPoints = (tasks, pts, base) => {
      const out = [];
      for (let i = 0; i < tasks.length; i++) {
        const v = parseInt(pts[i], 10);
        out.push(Number.isFinite(v) ? v : base);
      }
      return out;
    };

    const pointsMorning = fillPoints(morning, morningPoints, morningBase);
    const pointsAfternoon = fillPoints(
      afternoon,
      afternoonPoints,
      afternoonBase
    );
    const pointsVacation = fillPoints(vacation, vacationPoints, vacationBase);
    const pointsOptional = fillPoints(optional, optionalPoints, optionalBase);
    onSave({
      morning,
      afternoon,
      vacation,
      optional,
      pointsMorning,
      pointsAfternoon,
      pointsVacation,
      pointsOptional,
      pointsMorningBase: morningBase,
      pointsAfternoonBase: afternoonBase,
      pointsVacationBase: vacationBase,
      pointsOptionalBase: optionalBase,
      useMorning,
      useAfternoon,
      useVacation,
      useOptional,
    });
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>퀘스트 수정</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="useMorning"
            label="등교 전 퀘스트 사용"
            checked={useMorning}
            onChange={(e) => setUseMorning(e.target.checked)}
            className="mb-2"
          />
          <Form.Label>등교 전 퀘스트 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={morningText}
            onChange={(e) => setMorningText(e.target.value)}
            disabled={!useMorning}
          />
          <Form.Label className="mt-2">기본 포인트</Form.Label>
          <Form.Control
            type="number"
            value={morningBase}
            onChange={(e) => setMorningBase(parseInt(e.target.value, 10) || 0)}
            disabled={!useMorning}
            className="mb-2"
          />
          <Form.Label>
            포인트 목록 (한 줄에 하나씩, 비어 있으면 기본값 사용)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={morningPointsText}
            onChange={(e) => setMorningPointsText(e.target.value)}
            disabled={!useMorning}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="useAfternoon"
            label="하교 후 퀘스트 사용"
            checked={useAfternoon}
            onChange={(e) => setUseAfternoon(e.target.checked)}
            className="mb-2"
          />
          <Form.Label>하교 후 퀘스트 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={afternoonText}
            onChange={(e) => setAfternoonText(e.target.value)}
            disabled={!useAfternoon}
          />
          <Form.Label className="mt-2">기본 포인트</Form.Label>
          <Form.Control
            type="number"
            value={afternoonBase}
            onChange={(e) =>
              setAfternoonBase(parseInt(e.target.value, 10) || 0)
            }
            disabled={!useAfternoon}
            className="mb-2"
          />
          <Form.Label>
            포인트 목록 (한 줄에 하나씩, 비어 있으면 기본값 사용)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={afternoonPointsText}
            onChange={(e) => setAfternoonPointsText(e.target.value)}
            disabled={!useAfternoon}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="useVacation"
            label="방학 퀘스트 사용"
            checked={useVacation}
            onChange={(e) => setUseVacation(e.target.checked)}
            className="mb-2"
          />
          <Form.Label>방학 퀘스트 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={vacationText}
            onChange={(e) => setVacationText(e.target.value)}
            disabled={!useVacation}
          />
          <Form.Label className="mt-2">기본 포인트</Form.Label>
          <Form.Control
            type="number"
            value={vacationBase}
            onChange={(e) => setVacationBase(parseInt(e.target.value, 10) || 0)}
            disabled={!useVacation}
            className="mb-2"
          />
          <Form.Label>
            포인트 목록 (한 줄에 하나씩, 비어 있으면 기본값 사용)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={vacationPointsText}
            onChange={(e) => setVacationPointsText(e.target.value)}
            disabled={!useVacation}
          />
        </Form.Group>
        <Form.Group>
          <Form.Check
            type="switch"
            id="useOptional"
            label="선택 퀘스트 사용"
            checked={useOptional}
            onChange={(e) => setUseOptional(e.target.checked)}
            className="mb-2"
          />
          <Form.Label>선택 퀘스트 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={optionalText}
            onChange={(e) => setOptionalText(e.target.value)}
            disabled={!useOptional}
          />
          <Form.Label className="mt-2">기본 포인트</Form.Label>
          <Form.Control
            type="number"
            value={optionalBase}
            onChange={(e) => setOptionalBase(parseInt(e.target.value, 10) || 0)}
            disabled={!useOptional}
            className="mb-2"
          />
          <Form.Label>
            포인트 목록 (한 줄에 하나씩, 비어 있으면 기본값 사용)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={optionalPointsText}
            onChange={(e) => setOptionalPointsText(e.target.value)}
            disabled={!useOptional}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          취소
        </Button>
        <Button onClick={handleSave}>저장</Button>
      </Modal.Footer>
    </Modal>
  );
}
