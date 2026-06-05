import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Drawer,
  Popconfirm, message, Typography, Space, Descriptions,
  Tag, Spin, Divider, Statistic, Row, Col, Empty, Upload, Alert, List, Grid,
} from 'antd';

const { useBreakpoint } = Grid;
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
  UploadOutlined, InboxOutlined, DownloadOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import api from '../api/axios';

const { Option } = Select;

const GRADE_COLORS = { A: 'green', B: 'blue', C: 'gold', D: 'volcano', E: 'red' };
const gradeColor = (grade) => GRADE_COLORS[grade] ?? 'default';

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

export default function Students() {
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;

  const [students, setStudents] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamFilter, setStreamFilter] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [form] = Form.useForm();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/students');
      setStudents(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchStreams = async () => {
    try {
      const { data } = await api.get('/streams');
      setStreams(data.data);
    } catch (error) {
      message.error(apiError(error));
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchStreams();
  }, []);

  // Pre-fill form when edit modal opens
  useEffect(() => {
    if (modalOpen && editingStudent) {
      form.setFieldsValue({
        firstName: editingStudent.firstName,
        lastName: editingStudent.lastName,
        admissionNumber: editingStudent.admissionNumber,
        gender: editingStudent.gender || undefined,
        classStreamId: editingStudent.classStreamId,
      });
    }
  }, [modalOpen, editingStudent, form]);

  const openCreateModal = () => {
    setEditingStudent(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, values);
        message.success('Student updated successfully');
      } else {
        await api.post('/students', values);
        message.success('Student registered successfully');
      }
      closeModal();
      fetchStudents();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      message.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      message.error(apiError(error));
    }
  };

  const handleView = async (studentId) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const { data } = await api.get(`/results/student/${studentId}`);
      setDrawerData(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerData(null);
  };

  // ── CSV import ────────────────────────────────────────────────────────────

  const openImportModal = () => {
    setImportResult(null);
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportResult(null);
  };

  const handleImport = async (file) => {
    setImportLoading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data.data);
      if (data.data.imported > 0) fetchStudents();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setImportLoading(false);
    }
    return false; // Prevent antd auto-upload
  };

  const downloadTemplate = () => {
    const csv = [
      'firstName,lastName,admissionNumber,gender,classStreamName',
      'Jane,Doe,2024/001,Female,Form 1A',
      'John,Smith,2024/002,Male,Form 1A',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const filteredStudents = streamFilter
    ? students.filter((s) => s.classStreamId === streamFilter)
    : students;

  const columns = [
    {
      title: 'Admission No',
      dataIndex: 'admissionNumber',
      key: 'admissionNumber',
      sorter: (a, b) => a.admissionNumber.localeCompare(b.admissionNumber),
    },
    {
      title: 'Full Name',
      key: 'fullName',
      sorter: (a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
      render: (_, r) => `${r.firstName} ${r.lastName}`,
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 100,
      render: (v) => v || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Class Stream',
      dataIndex: ['classStream', 'name'],
      key: 'classStream',
      width: 140,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.id)}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete student"
            description={`Remove ${record.firstName} ${record.lastName}?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const scoreColumns = [
    {
      title: 'Subject',
      dataIndex: ['subject', 'name'],
      key: 'subject',
    },
    {
      title: 'EXAM',
      key: 'exam',
      align: 'center',
      width: 70,
      render: (_, r) =>
        r.examMarks != null
          ? r.examMarks
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'CAT',
      key: 'cat',
      align: 'center',
      width: 70,
      render: (_, r) =>
        r.catMarks != null
          ? r.catMarks
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Total / Max',
      key: 'total',
      align: 'center',
      width: 100,
      render: (_, r) =>
        r.totalMaxMarks > 0
          ? `${r.totalMarks} / ${r.totalMaxMarks}`
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '%',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'center',
      width: 70,
      render: (v, r) =>
        r.totalMaxMarks > 0
          ? `${v}%`
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      align: 'center',
      width: 70,
      render: (v) => <Tag color={gradeColor(v)}>{v}</Tag>,
    },
  ];

  return (
    <>
      {/* ── Page header ── */}
      <div className="page-header">
        <Typography.Title level={2} style={{ margin: 0 }}>Students</Typography.Title>
        <Space wrap>
          <Button icon={<UploadOutlined />} onClick={openImportModal}>Import CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>New Student</Button>
        </Space>
      </div>

      {/* ── Stream filter ── */}
      <div style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Filter by stream"
          style={{ width: '100%', maxWidth: 260 }}
          value={streamFilter}
          onChange={(v) => setStreamFilter(v ?? null)}
        >
          {streams.map((s) => (
            <Option key={s.id} value={s.id}>{s.name}</Option>
          ))}
        </Select>
      </div>

      {/* ── Students table ── */}
      <Table
        rowKey="id"
        dataSource={filteredStudents}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: (
            <Empty
              description={streamFilter ? 'No students in this stream.' : 'No students registered yet.'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editingStudent ? 'Edit Student' : 'Register Student'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingStudent ? 'Save Changes' : 'Register'}
        confirmLoading={submitting}
        destroyOnClose
        width={isMobile ? '95vw' : 520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'First name is required' }]}
              >
                <Input placeholder="First name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Last name is required' }]}
              >
                <Input placeholder="Last name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="admissionNumber"
            label="Admission Number"
            rules={[{ required: true, message: 'Admission number is required' }]}
          >
            <Input placeholder="e.g. 2024/001" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Select gender" allowClear>
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="classStreamId"
                label="Class Stream"
                rules={[{ required: true, message: 'Class stream is required' }]}
              >
                <Select placeholder="Select stream">
                  {streams.map((s) => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Import CSV Modal ── */}
      <Modal
        title="Import Students from CSV"
        open={importModalOpen}
        onCancel={closeImportModal}
        footer={[
          <Button key="tpl" icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Download Template
          </Button>,
          <Button key="close" type="primary" onClick={closeImportModal}>
            Close
          </Button>,
        ]}
        width={isMobile ? '95vw' : 540}
        destroyOnClose
      >
        {/* Result summary */}
        {importResult && (
          <div style={{ marginBottom: 20 }}>
            <Alert
              type={importResult.imported > 0 ? 'success' : 'warning'}
              icon={<CheckCircleOutlined />}
              showIcon
              message={
                <span>
                  <strong>{importResult.imported}</strong> student{importResult.imported !== 1 ? 's' : ''} imported
                  {importResult.skippedCount > 0 && (
                    <span style={{ marginLeft: 8, color: '#faad14' }}>
                      · <strong>{importResult.skippedCount}</strong> row{importResult.skippedCount !== 1 ? 's' : ''} skipped
                    </span>
                  )}
                </span>
              }
              style={{ marginBottom: importResult.skippedCount > 0 ? 8 : 0 }}
            />
            {importResult.skippedCount > 0 && (
              <List
                size="small"
                bordered
                style={{ maxHeight: 180, overflowY: 'auto' }}
                dataSource={importResult.skipped}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 12px' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Row {item.row}
                      {item.admissionNumber && item.admissionNumber !== '—'
                        ? ` · ${item.admissionNumber}`
                        : ''
                      }
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12, marginLeft: 8 }}>
                      {item.reason}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}

        {/* Drop zone */}
        <Spin spinning={importLoading}>
          <Upload.Dragger
            accept=".csv"
            maxCount={1}
            showUploadList={false}
            beforeUpload={handleImport}
            disabled={importLoading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag a CSV file to upload</p>
            <p className="ant-upload-hint">
              Required columns: <code>firstName, lastName, admissionNumber, classStreamName</code>
              <br />
              Optional: <code>gender</code> (Male / Female / Other)
            </p>
          </Upload.Dragger>
        </Spin>
      </Modal>

      {/* ── View Drawer ── */}
      <Drawer
        title={
          drawerData
            ? `${drawerData.student.firstName} ${drawerData.student.lastName}`
            : 'Student Details'
        }
        open={drawerOpen}
        onClose={closeDrawer}
        width={isMobile ? '100vw' : 620}
      >
        {drawerLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
            <Spin size="large" />
          </div>
        )}

        {!drawerLoading && drawerData && (
          <>
            <Descriptions bordered size="small" column={isMobile ? 1 : 2}>
              <Descriptions.Item label="Admission No">
                {drawerData.student.admissionNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {drawerData.student.gender || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Class Stream">
                {drawerData.student.classStream.name}
              </Descriptions.Item>
              <Descriptions.Item label="Class Position">
                {drawerData.overall.classPosition} / {drawerData.overall.totalStudentsInStream}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ marginTop: 24 }}>
              Academic Results
            </Divider>

            {drawerData.subjects.length === 0 ? (
              <Typography.Text type="secondary">No scores recorded yet.</Typography.Text>
            ) : (
              <>
                <Table
                  rowKey={(r) => r.subject.id}
                  dataSource={drawerData.subjects}
                  columns={scoreColumns}
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  style={{ marginBottom: 24 }}
                />

                <Row gutter={16}>
                  <Col xs={8}>
                    <Statistic
                      title="Aggregate Points"
                      value={drawerData.overall.aggregateMarks}
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic
                      title="Mean Score"
                      value={drawerData.overall.meanScore}
                      suffix="%"
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic
                      title="Overall Grade"
                      value={drawerData.overall.overallGrade}
                    />
                  </Col>
                </Row>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
