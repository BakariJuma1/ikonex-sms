import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Drawer,
  Popconfirm, message, Typography, Space, List, Tag, Spin, Empty,
} from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import api from '../api/axios';

const apiError = (error) =>
  error.response?.data?.error || 'An unexpected error occurred';

export default function Streams() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);

  const [form] = Form.useForm();

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchStreams = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/streams');
      setStreams(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  // ── Create / Edit ─────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingStream(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (stream) => {
    setEditingStream(stream);
    form.setFieldsValue({ name: stream.name });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingStream(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingStream) {
        await api.put(`/streams/${editingStream.id}`, { name: values.name });
        message.success('Stream updated successfully');
        // Refresh drawer if this stream is open
        if (selectedStream?.id === editingStream.id) {
          setSelectedStream((prev) => ({ ...prev, name: values.name }));
        }
      } else {
        await api.post('/streams', { name: values.name });
        message.success('Stream created successfully');
      }
      closeModal();
      fetchStreams();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    try {
      await api.delete(`/streams/${id}`);
      message.success('Stream deleted successfully');
      if (selectedStream?.id === id) {
        setDrawerOpen(false);
        setSelectedStream(null);
      }
      fetchStreams();
    } catch (error) {
      message.error(apiError(error));
    }
  };

  // ── Bulk add ─────────────────────────────────────────────────────────────

  const handleBulkAdd = async () => {
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) {
      message.warning('Enter at least one stream name');
      return;
    }

    setBulkLoading(true);
    try {
      const { data } = await api.post('/streams/bulk', { names });
      const { created, skippedCount } = data.data;
      if (created > 0) fetchStreams();
      const msg = `${created} stream${created !== 1 ? 's' : ''} created`;
      if (skippedCount > 0) {
        message.warning(`${msg}, ${skippedCount} skipped (duplicates)`);
      } else {
        message.success(msg);
      }
      setBulkModalOpen(false);
      setBulkText('');
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setBulkLoading(false);
    }
  };

  // ── View drawer ───────────────────────────────────────────────────────────

  const handleView = async (id) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setSelectedStream(null);
    try {
      const { data } = await api.get(`/streams/${id}`);
      setSelectedStream(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedStream(null);
  };

  // ── Remove subject from stream ────────────────────────────────────────────

  const handleRemoveSubject = async (assignmentId, subjectName) => {
    try {
      await api.delete(`/stream-subjects/${assignmentId}`);
      message.success(`"${subjectName}" removed from stream`);
      const { data } = await api.get(`/streams/${selectedStream.id}`);
      setSelectedStream(data.data);
      fetchStreams();
    } catch (error) {
      message.error(apiError(error));
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Students',
      dataIndex: ['_count', 'students'],
      key: 'students',
      align: 'center',
      width: 110,
    },
    {
      title: 'Subjects',
      dataIndex: ['_count', 'streamSubjects'],
      key: 'streamSubjects',
      align: 'center',
      width: 110,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 200,
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
            title="Delete stream"
            description={`Delete "${record.name}"? Students in this stream will also be removed.`}
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
        <Typography.Title level={2} style={{ margin: 0 }}>Streams</Typography.Title>
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={() => { setBulkText(''); setBulkModalOpen(true); }}>
            Bulk Add
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            New Stream
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        dataSource={streams}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty
              description="No streams yet. Create a stream to get started."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      {/* ── Bulk Add Modal ── */}
      <Modal
        title={<Space><ThunderboltOutlined />Bulk Add Streams</Space>}
        open={bulkModalOpen}
        onCancel={() => { setBulkModalOpen(false); setBulkText(''); }}
        onOk={handleBulkAdd}
        okText="Add All"
        confirmLoading={bulkLoading}
        destroyOnClose
        width={440}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Enter one stream name per line.
        </Typography.Paragraph>
        <Input.TextArea
          rows={10}
          placeholder={'Form 1A\nForm 1B\nForm 2A\nForm 2B'}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editingStream ? `Edit Stream — ${editingStream.name}` : 'New Stream'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingStream ? 'Save Changes' : 'Create'}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Stream Name"
            rules={[{ required: true, message: 'Stream name is required' }]}
          >
            <Input placeholder="e.g. Form 1A" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Detail Drawer ── */}
      <Drawer
        title={selectedStream ? selectedStream.name : 'Stream Details'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={480}
      >
        {drawerLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
            <Spin size="large" />
          </div>
        )}

        {!drawerLoading && selectedStream && (
          <>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Students ({selectedStream.students.length})
            </Typography.Title>

            {selectedStream.students.length === 0 ? (
              <Empty
                description="No students enrolled in this stream."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginBottom: 24 }}
              />
            ) : (
              <List
                size="small"
                bordered
                dataSource={selectedStream.students}
                style={{ marginBottom: 24 }}
                renderItem={(student) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${student.firstName} ${student.lastName}`}
                      description={student.admissionNumber}
                    />
                  </List.Item>
                )}
              />
            )}

            <Typography.Title level={5} style={{ marginTop: 24 }}>
              Subjects ({selectedStream.streamSubjects.length})
            </Typography.Title>

            {selectedStream.streamSubjects.length === 0 ? (
              <Empty
                description="No subjects assigned. Use the Subjects page to assign subjects to this stream."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Space wrap>
                {selectedStream.streamSubjects.map(({ id, subject }) => (
                  <Tag
                    key={id}
                    color="blue"
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      handleRemoveSubject(id, subject.name);
                    }}
                  >
                    {subject.name} ({subject.code})
                  </Tag>
                ))}
              </Space>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
