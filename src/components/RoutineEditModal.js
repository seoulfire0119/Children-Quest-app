import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function RoutineEditModal({ show, onHide, tasks, onSave }) {
  const [morningText, setMorningText] = useState("");
  const [afternoonText, setAfternoonText] = useState("");

  useEffect(() => {
    setMorningText(tasks.morning.join("\n"));
    setAfternoonText(tasks.afternoon.join("\n"));
  }, [tasks]);

  const handleSave = () => {
    const morning = morningText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const afternoon = afternoonText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    onSave({ morning, afternoon });
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>루틴 수정</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>등교 전 루틴 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={morningText}
            onChange={(e) => setMorningText(e.target.value)}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>하교 후 루틴 (한 줄에 하나씩)</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={afternoonText}
            onChange={(e) => setAfternoonText(e.target.value)}
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
