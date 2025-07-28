import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function RoutineEditModal({ show, onHide, config, onSave }) {
  const [morningText, setMorningText] = useState("");
  const [afternoonText, setAfternoonText] = useState("");
  const [vacationText, setVacationText] = useState("");
  const [optionalText, setOptionalText] = useState("");

  const [useMorning, setUseMorning] = useState(true);
  const [useAfternoon, setUseAfternoon] = useState(true);
  const [useVacation, setUseVacation] = useState(true);
  const [useOptional, setUseOptional] = useState(true);
  useEffect(() => {
    setMorningText((config.morning || []).join("\n"));
    setAfternoonText((config.afternoon || []).join("\n"));
    setVacationText((config.vacation || []).join("\n"));
    setOptionalText((config.optional || []).join("\n"));
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
    const afternoon = afternoonText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const vacation = vacationText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const optional = optionalText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    onSave({
      morning,
      afternoon,
      vacation,
      optional,
      useMorning,
      useAfternoon,
      useVacation,
      useOptional,
    });
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>루틴 수정</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="useMorning"
            label="등교 전 루틴 사용"
            checked={useMorning}
            onChange={(e) => setUseMorning(e.target.checked)}
            className="mb-2"
          />
          <Form.Label>등교 전 루틴 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={morningText}
            onChange={(e) => setMorningText(e.target.value)}
            disabled={!useMorning}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="useAfternoon"
            label="하교 후 루틴 사용"
            checked={useAfternoon}
            onChange={(e) => setUseAfternoon(e.target.checked)}
            className="mb-2"
          />
          <Form.Label>하교 후 루틴 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={afternoonText}
            onChange={(e) => setAfternoonText(e.target.value)}
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
