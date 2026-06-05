import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Drawer,
  Popconfirm, message, Typography, Space, Tag, Spin,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons';
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New Subject
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={subjects}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: false }}
      />

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
                    <Tag key={id} color="blue" style={{ fontSize: 14, padding: '4px 10px' }}>
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
