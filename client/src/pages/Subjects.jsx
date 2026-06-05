import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Drawer,
  Popconfirm, message, Typography, Space, Tag, Spin, Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusCircleOutlined, ThunderboltOutlined, MinusCircleOutlined } from '@ant-design/icons';
import api from '../api/axios';

const { Option } = Select;

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignForm] = Form.useForm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState(null);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkForm] = Form.useForm();

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/subjects');
      setSubjects(data.data);
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
    fetchSubjects();
    fetchStreams();
  }, []);

  useEffect(() => {
    if (modalOpen && editingSubject) {
      form.setFieldsValue({ name: editingSubject.name, code: editingSubject.code });
    }
  }, [modalOpen, editingSubject, form]);

  // ── Create / Edit ─────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingSubject(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSubject(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, values);
        message.success('Subject updated successfully');
      } else {
        await api.post('/subjects', values);
        message.success('Subject created successfully');
      }
      closeModal();
      fetchSubjects();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk add ─────────────────────────────────────────────────────────────

  const openBulkModal = () => {
    bulkForm.setFieldsValue({ subjects: [{ name: '', code: '' }, { name: '', code: '' }, { name: '', code: '' }] });
    setBulkModalOpen(true);
  };

  const handleBulkAdd = async (values) => {
    const subjects = (values.subjects || []).filter((s) => s?.name?.trim() || s?.code?.trim());
    if (subjects.length === 0) {
      message.warning('Fill in at least one subject row');
      return;
    }

    setBulkLoading(true);
    try {
      const { data } = await api.post('/subjects/bulk', { subjects });
      const { created, skippedCount } = data.data;
      if (created > 0) fetchSubjects();
      const msg = `${created} subject${created !== 1 ? 's' : ''} created`;
      if (skippedCount > 0) {
        message.warning(`${msg}, ${skippedCount} skipped (duplicates or missing fields)`);
      } else {
        message.success(msg);
      }
      setBulkModalOpen(false);
      bulkForm.resetFields();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    try {
      await api.delete(`/subjects/${id}`);
      message.success('Subject deleted successfully');
      fetchSubjects();
    } catch (error) {
      message.error(apiError(error));
    }
  };

  // ── Assign to stream ──────────────────────────────────────────────────────

  const openAssignModal = (subject) => {
    setAssigningSubject(subject);
    assignForm.resetFields();
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningSubject(null);
    assignForm.resetFields();
  };

  const handleAssign = async (values) => {
    setAssignSubmitting(true);
    try {
      await api.post('/stream-subjects', {
        classStreamId: values.classStreamId,
        subjectId: assigningSubject.id,
      });
      message.success(`"${assigningSubject.name}" assigned to stream successfully`);
      closeAssignModal();
      fetchSubjects();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setAssignSubmitting(false);
    }
  };

  // ── View drawer ───────────────────────────────────────────────────────────

  const handleView = async (id) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const { data } = await api.get(`/subjects/${id}`);
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

  const handleUnassign = async (assignmentId, streamName) => {
    try {
      await api.delete(`/stream-subjects/${assignmentId}`);
      message.success(`Removed from "${streamName}"`);
      // Refresh drawer and list count
      const { data } = await api.get(`/subjects/${drawerData.id}`);
      setDrawerData(data.data);
      fetchSubjects();
    } catch (error) {
      message.error(apiError(error));
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => handleView(record.id)}>
          {name}
        </Button>
      ),
    },
    {
      title: 'Assigned Streams',
      dataIndex: ['_count', 'streamSubjects'],
      key: 'streamSubjects',
      align: 'center',
      width: 160,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={() => openAssignModal(record)}
          >
            Assign to Stream
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete subject"
            description={`Delete "${record.name}"?`}
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Subjects</Typography.Title>
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={openBulkModal}>
            Bulk Add
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            New Subject
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        dataSource={subjects}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty
              description="No subjects yet. Add a subject to get started."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      {/* ── Bulk Add Modal ── */}
      <Modal
        title={<Space><ThunderboltOutlined />Bulk Add Subjects</Space>}
        open={bulkModalOpen}
        onCancel={() => { setBulkModalOpen(false); bulkForm.resetFields(); }}
        onOk={() => bulkForm.submit()}
        okText="Add All"
        confirmLoading={bulkLoading}
        destroyOnClose
        width={560}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Fill in each row with a subject name and code. Leave empty rows blank — they will be ignored.
        </Typography.Paragraph>
        <Form form={bulkForm} onFinish={handleBulkAdd}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4, paddingRight: 32 }}>
            <Typography.Text strong style={{ flex: 1 }}>Subject Name</Typography.Text>
            <Typography.Text strong style={{ width: 110 }}>Code</Typography.Text>
          </div>
          <Form.List name="subjects">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <Form.Item name={[name, 'name']} style={{ flex: 1, margin: 0 }}>
                      <Input placeholder="e.g. Mathematics" />
                    </Form.Item>
                    <Form.Item
                      name={[name, 'code']}
                      normalize={(v) => v?.toUpperCase()}
                      style={{ width: 110, margin: 0 }}
                    >
                      <Input placeholder="e.g. MAT" maxLength={10} />
                    </Form.Item>
                    <MinusCircleOutlined
                      style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 16 }}
                      onClick={() => remove(name)}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ name: '', code: '' })}
                  icon={<PlusOutlined />}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  Add Row
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editingSubject ? 'Edit Subject' : 'New Subject'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingSubject ? 'Save Changes' : 'Create'}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Subject Name"
            rules={[{ required: true, message: 'Subject name is required' }]}
          >
            <Input placeholder="e.g. Mathematics" autoFocus />
          </Form.Item>
          <Form.Item
            name="code"
            label="Subject Code"
            normalize={(v) => v?.toUpperCase()}
            rules={[{ required: true, message: 'Subject code is required' }]}
          >
            <Input placeholder="e.g. MAT" maxLength={10} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Assign to Stream Modal ── */}
      <Modal
        title={`Assign to Stream — ${assigningSubject?.name ?? ''}`}
        open={assignModalOpen}
        onCancel={closeAssignModal}
        onOk={() => assignForm.submit()}
        okText="Assign"
        confirmLoading={assignSubmitting}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssign} style={{ marginTop: 16 }}>
          <Form.Item label="Subject">
            <Input
              value={
                assigningSubject
                  ? `${assigningSubject.name} (${assigningSubject.code})`
                  : ''
              }
              disabled
            />
          </Form.Item>
          <Form.Item
            name="classStreamId"
            label="Stream"
            rules={[{ required: true, message: 'Please select a stream' }]}
          >
            <Select placeholder="Select a stream" autoFocus>
              {streams.map((s) => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── View Drawer ── */}
      <Drawer
        title={drawerData ? `${drawerData.name} (${drawerData.code})` : 'Subject Details'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={420}
      >
        {drawerLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
            <Spin size="large" />
          </div>
        )}

        {!drawerLoading && drawerData && (
          <>
            <Typography.Text type="secondary">
              Assigned to {drawerData.streamSubjects.length} stream
              {drawerData.streamSubjects.length !== 1 ? 's' : ''}
            </Typography.Text>

            <div style={{ marginTop: 16 }}>
              {drawerData.streamSubjects.length === 0 ? (
                <Typography.Text type="secondary">
                  Not assigned to any stream yet.
                </Typography.Text>
              ) : (
                <Space wrap>
                  {drawerData.streamSubjects.map(({ id, classStream }) => (
                    <Tag
                      key={id}
                      color="blue"
                      style={{ fontSize: 14, padding: '4px 10px' }}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleUnassign(id, classStream.name);
                      }}
                    >
                      {classStream.name}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
