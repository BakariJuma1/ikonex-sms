import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Drawer,
  Popconfirm, message, Typography, Space, List, Tag, Spin,
} from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/axios';

export default function Streams() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const [form] = Form.useForm();

  const fetchStreams = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/streams');
      setStreams(data.data);
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to fetch streams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/streams', { name: values.name });
      message.success('Stream created successfully');
      setModalOpen(false);
      form.resetFields();
      fetchStreams();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create stream');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/streams/${id}`);
      message.success('Stream deleted successfully');
      fetchStreams();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete stream');
    }
  };

  const handleView = async (id) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setSelectedStream(null);
    try {
      const { data } = await api.get(`/streams/${id}`);
      setSelectedStream(data.data);
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to fetch stream details');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedStream(null);
  };

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
      width: 120,
    },
    {
      title: 'Subjects',
      dataIndex: ['_count', 'streamSubjects'],
      key: 'streamSubjects',
      align: 'center',
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 160,
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
          <Popconfirm
            title="Delete stream"
            description={`Are you sure you want to delete "${record.name}"?`}
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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Streams
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Stream
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={streams}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />

      {/* ── Create Modal ── */}
      <Modal
        title="New Stream"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Create"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 16 }}
        >
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
              <Typography.Text type="secondary">No students enrolled.</Typography.Text>
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
              <Typography.Text type="secondary">No subjects assigned.</Typography.Text>
            ) : (
              <Space wrap>
                {selectedStream.streamSubjects.map(({ id, subject }) => (
                  <Tag key={id} color="blue">
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
