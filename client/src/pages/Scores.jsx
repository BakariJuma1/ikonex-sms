import { useState, useEffect } from 'react';
import {
  Table, Select, Button, Modal, Form, InputNumber,
  Drawer, message, Typography, Space, Spin, Tag,
} from 'antd';
import { BarChartOutlined, ThunderboltOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../api/axios';

const { Option } = Select;

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

const fmt = (val) => (val != null ? parseFloat(val) : 0);

export default function Scores() {
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  // ── Per-row modal (view mode) ─────────────────────────────────────────────
  const [scoreModal, setScoreModal] = useState({
    open: false, student: null, examType: null, existingScore: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // ── Bulk entry mode ───────────────────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState(false);
  // { [studentId]: { EXAM: number|null, CAT: number|null } }
  const [bulkEdits, setBulkEdits] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/streams');
        setStreams(data.data);
      } catch (error) {
        message.error(apiError(error));
      }
    })();
  }, []);

  const fetchTableData = async (streamId, subjectId) => {
    setTableLoading(true);
    try {
      const { data } = await api.get(`/scores/stream/${streamId}`, { params: { subjectId } });
      setTableData(data.data.students);
    } catch (error) {
      message.error(apiError(error));
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  const handleStreamChange = async (streamId) => {
    const id = streamId ?? null;
    setSelectedStreamId(id);
    setSelectedSubjectId(null);
    setSubjects([]);
    setTableData([]);
    setBulkMode(false);
    setBulkEdits({});

    if (!id) return;

    setSubjectsLoading(true);
    try {
      const { data } = await api.get(`/stream-subjects/stream/${id}`);
      setSubjects(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    const id = subjectId ?? null;
    setSelectedSubjectId(id);
    setBulkMode(false);
    setBulkEdits({});
    if (id && selectedStreamId) {
      fetchTableData(selectedStreamId, id);
    } else {
      setTableData([]);
    }
  };

  // ── Per-row modal handlers ────────────────────────────────────────────────

  const openScoreModal = (student, examType, existingScore) => {
    const maxMarks = examType === 'EXAM' ? 70 : 30;
    setScoreModal({ open: true, student, examType, existingScore });
    if (existingScore) {
      form.setFieldsValue({ marks: fmt(existingScore.marks), maxMarks });
    } else {
      form.resetFields();
      form.setFieldsValue({ maxMarks });
    }
  };

  const closeScoreModal = () => {
    setScoreModal({ open: false, student: null, examType: null, existingScore: null });
    form.resetFields();
  };

  const handleScoreSubmit = async (values) => {
    setSubmitting(true);
    const { student, examType, existingScore } = scoreModal;
    try {
      if (existingScore) {
        await api.put(`/scores/${existingScore.id}`, { marks: values.marks, maxMarks: values.maxMarks });
        message.success('Score updated successfully');
      } else {
        await api.post('/scores', {
          studentId: student.id,
          subjectId: selectedSubjectId,
          examType,
          marks: values.marks,
          maxMarks: values.maxMarks,
        });
        message.success('Score saved successfully');
      }
      closeScoreModal();
      fetchTableData(selectedStreamId, selectedSubjectId);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk entry handlers ───────────────────────────────────────────────────

  const enterBulkMode = () => {
    const edits = {};
    tableData.forEach((s) => {
      edits[s.id] = {
        EXAM: s.EXAM ? fmt(s.EXAM.marks) : null,
        CAT: s.CAT ? fmt(s.CAT.marks) : null,
      };
    });
    setBulkEdits(edits);
    setBulkMode(true);
  };

  const cancelBulkMode = () => {
    setBulkMode(false);
    setBulkEdits({});
  };

  const handleBulkChange = (studentId, examType, val) => {
    setBulkEdits((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [examType]: val },
    }));
  };

  const saveBulkEdits = async () => {
    const calls = [];

    for (const student of tableData) {
      const edits = bulkEdits[student.id];
      if (!edits) continue;

      for (const examType of ['CAT', 'EXAM']) {
        const newMarks = edits[examType];
        if (newMarks === null || newMarks === undefined) continue;

        const existing = student[examType];
        const maxMarks = examType === 'EXAM' ? 70 : 30;

        if (existing) {
          // Only PUT if the value actually changed
          if (newMarks !== fmt(existing.marks)) {
            calls.push(api.put(`/scores/${existing.id}`, { marks: newMarks, maxMarks }));
          }
        } else {
          calls.push(api.post('/scores', {
            studentId: student.id,
            subjectId: selectedSubjectId,
            examType,
            marks: newMarks,
            maxMarks,
          }));
        }
      }
    }

    if (calls.length === 0) {
      message.info('No changes to save');
      cancelBulkMode();
      return;
    }

    setBulkSaving(true);
    try {
      await Promise.all(calls);
      message.success(`${calls.length} score${calls.length !== 1 ? 's' : ''} saved`);
      cancelBulkMode();
      fetchTableData(selectedStreamId, selectedSubjectId);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Column definitions ────────────────────────────────────────────────────

  const scoreCell = (record, examType) => {
    const score = record[examType];
    const maxDisplay = examType === 'EXAM' ? 70 : 30;
    if (!score) {
      return (
        <Button type="dashed" size="small" onClick={() => openScoreModal(record, examType, null)}>
          Add
        </Button>
      );
    }
    return (
      <Space size={6}>
        <Typography.Text strong>{fmt(score.marks)}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>/ {maxDisplay}</Typography.Text>
        <Button size="small" onClick={() => openScoreModal(record, examType, score)}>Edit</Button>
      </Space>
    );
  };

  const viewColumns = [
    { title: 'Admission No', dataIndex: 'admissionNumber', key: 'admissionNumber', width: 130 },
    { title: 'Full Name', key: 'fullName', render: (_, r) => `${r.firstName} ${r.lastName}` },
    { title: 'CAT (30)', key: 'CAT', align: 'center', width: 180, render: (_, r) => scoreCell(r, 'CAT') },
    { title: 'EXAM (70)', key: 'EXAM', align: 'center', width: 180, render: (_, r) => scoreCell(r, 'EXAM') },
    {
      title: 'Average',
      key: 'average',
      align: 'center',
      width: 100,
      render: (_, r) => {
        if (!r.EXAM && !r.CAT) return <Typography.Text type="secondary">—</Typography.Text>;
        const total = fmt(r.EXAM?.marks) + fmt(r.CAT?.marks);
        const max = (r.EXAM ? 70 : 0) + (r.CAT ? 30 : 0);
        return `${total} / ${max}`;
      },
    },
  ];

  const bulkColumns = [
    { title: 'Admission No', dataIndex: 'admissionNumber', key: 'admissionNumber', width: 130 },
    { title: 'Full Name', key: 'fullName', render: (_, r) => `${r.firstName} ${r.lastName}` },
    {
      title: 'CAT (/ 30)',
      key: 'CAT',
      align: 'center',
      width: 160,
      render: (_, r) => (
        <InputNumber
          value={bulkEdits[r.id]?.CAT ?? null}
          onChange={(val) => handleBulkChange(r.id, 'CAT', val)}
          min={0}
          max={30}
          step={0.5}
          style={{ width: 110 }}
          placeholder="—"
        />
      ),
    },
    {
      title: 'EXAM (/ 70)',
      key: 'EXAM',
      align: 'center',
      width: 160,
      render: (_, r) => (
        <InputNumber
          value={bulkEdits[r.id]?.EXAM ?? null}
          onChange={(val) => handleBulkChange(r.id, 'EXAM', val)}
          min={0}
          max={70}
          step={0.5}
          style={{ width: 110 }}
          placeholder="—"
        />
      ),
    },
    {
      title: 'Average',
      key: 'average',
      align: 'center',
      width: 100,
      render: (_, r) => {
        const cat = bulkEdits[r.id]?.CAT;
        const exam = bulkEdits[r.id]?.EXAM;
        if (cat == null && exam == null) return <Typography.Text type="secondary">—</Typography.Text>;
        const total = (exam ?? 0) + (cat ?? 0);
        const max = (exam != null ? 70 : 0) + (cat != null ? 30 : 0);
        return `${total} / ${max}`;
      },
    },
  ];

  const perfColumns = [
    { title: 'Admission No', dataIndex: 'admissionNumber', key: 'admissionNumber', width: 120 },
    { title: 'Full Name', key: 'fullName', render: (_, r) => `${r.firstName} ${r.lastName}` },
    {
      title: 'CAT (30)', key: 'cat', align: 'center', width: 85,
      render: (_, r) => r.CAT ? fmt(r.CAT.marks) : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'EXAM (70)', key: 'exam', align: 'center', width: 85,
      render: (_, r) => r.EXAM ? fmt(r.EXAM.marks) : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Average', key: 'average', align: 'center', width: 110,
      render: (_, r) => {
        const total = fmt(r.EXAM?.marks) + fmt(r.CAT?.marks);
        const max = (r.EXAM ? 70 : 0) + (r.CAT ? 30 : 0);
        return max > 0 ? `${total} / ${max}` : <Typography.Text type="secondary">—</Typography.Text>;
      },
    },
    {
      title: '%', key: 'pct', align: 'center', width: 75,
      render: (_, r) => {
        const total = fmt(r.EXAM?.marks) + fmt(r.CAT?.marks);
        const max = (r.EXAM ? 70 : 0) + (r.CAT ? 30 : 0);
        if (max === 0) return <Typography.Text type="secondary">—</Typography.Text>;
        return `${((total / max) * 100).toFixed(1)}%`;
      },
    },
  ];

  // ── Derived values ────────────────────────────────────────────────────────

  const bothSelected = Boolean(selectedStreamId && selectedSubjectId);
  const selectedStream = streams.find((s) => s.id === selectedStreamId);
  const selectedSubjectEntry = subjects.find((s) => s.subjectId === selectedSubjectId);

  const drawerTitle = selectedStream && selectedSubjectEntry
    ? `Class Performance — ${selectedStream.name} — ${selectedSubjectEntry.subject.name}`
    : 'Class Performance';

  const modalTitle = scoreModal.student
    ? `${scoreModal.existingScore ? 'Edit' : 'Add'} ${scoreModal.examType} Score — ${scoreModal.student.firstName} ${scoreModal.student.lastName}`
    : 'Score Entry';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Typography.Title level={2} style={{ margin: 0 }}>Scores</Typography.Title>
          {bulkMode && (
            <Tag color="blue" style={{ fontSize: 12 }}>Bulk Entry Mode</Tag>
          )}
        </div>

        <Space>
          {bulkMode ? (
            <>
              <Button
                icon={<CloseOutlined />}
                onClick={cancelBulkMode}
                disabled={bulkSaving}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={bulkSaving}
                onClick={saveBulkEdits}
              >
                Save All
              </Button>
            </>
          ) : (
            <>
              {bothSelected && (
                <Button icon={<ThunderboltOutlined />} onClick={enterBulkMode} disabled={tableLoading}>
                  Bulk Entry
                </Button>
              )}
              {bothSelected && (
                <Button icon={<BarChartOutlined />} onClick={() => setDrawerOpen(true)}>
                  View Class Performance
                </Button>
              )}
            </>
          )}
        </Space>
      </div>

      {/* ── Cascading selects ── */}
      <Space style={{ marginBottom: 20 }} wrap>
        <Select
          placeholder="1. Select stream"
          style={{ width: 200 }}
          value={selectedStreamId}
          onChange={handleStreamChange}
          allowClear
          disabled={bulkMode}
        >
          {streams.map((s) => (
            <Option key={s.id} value={s.id}>{s.name}</Option>
          ))}
        </Select>

        <Select
          placeholder="2. Select subject"
          style={{ width: 230 }}
          value={selectedSubjectId}
          onChange={handleSubjectChange}
          disabled={!selectedStreamId || bulkMode}
          loading={subjectsLoading}
          allowClear
          notFoundContent={
            selectedStreamId && !subjectsLoading
              ? <Typography.Text type="secondary">No subjects assigned to this stream</Typography.Text>
              : null
          }
        >
          {subjects.map((s) => (
            <Option key={s.id} value={s.subjectId}>
              {s.subject.name} ({s.subject.code})
            </Option>
          ))}
        </Select>
      </Space>

      {/* ── Table ── */}
      {bothSelected ? (
        <Table
          rowKey="id"
          dataSource={tableData}
          columns={bulkMode ? bulkColumns : viewColumns}
          loading={tableLoading}
          pagination={false}
          bordered
          size="middle"
        />
      ) : (
        <div style={{
          padding: '56px 0',
          textAlign: 'center',
          border: '1px dashed #d9d9d9',
          borderRadius: 8,
        }}>
          <Typography.Text type="secondary">
            Select a stream and subject above to view and enter scores
          </Typography.Text>
        </div>
      )}

      {/* ── Per-row Score Modal ── */}
      <Modal
        title={modalTitle}
        open={scoreModal.open}
        onCancel={closeScoreModal}
        onOk={() => form.submit()}
        okText={scoreModal.existingScore ? 'Save Changes' : 'Save Score'}
        confirmLoading={submitting}
        destroyOnClose
        width={340}
      >
        <Form form={form} layout="vertical" onFinish={handleScoreSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="marks"
            label="Marks"
            rules={[
              { required: true, message: 'Marks are required' },
              { type: 'number', min: 0, message: 'Marks cannot be negative' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="Enter marks scored" autoFocus />
          </Form.Item>
          <Form.Item name="maxMarks" label="Max Marks">
            <InputNumber style={{ width: '100%' }} disabled />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Class Performance Drawer ── */}
      <Drawer
        title={drawerTitle}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={680}
      >
        {tableLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={tableData}
            columns={perfColumns}
            size="small"
            pagination={false}
          />
        )}
      </Drawer>
    </>
  );
}
