import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber,
  Popconfirm, message, Typography, Space, Tag, Empty, Grid,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import api from '../api/axios';

const { useBreakpoint } = Grid;

const GRADE_LETTER_COLORS = { A: 'green', B: 'blue', C: 'gold', D: 'volcano', E: 'red' };
const gradeTagColor = (g) => GRADE_LETTER_COLORS[g?.[0]] ?? 'default';

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

export default function GradingScale() {
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;

  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchScales = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/grading-scales');
      setScales(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScales();
  }, []);

  const openCreateModal = () => {
    setEditingScale(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (scale) => {
    setEditingScale(scale);
    form.setFieldsValue({
      minScore: parseFloat(scale.minScore),
      maxScore: parseFloat(scale.maxScore),
      points: parseFloat(scale.points),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingScale(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingScale) {
        await api.put(`/grading-scales/${editingScale.id}`, values);
        message.success('Grade updated successfully');
      } else {
        await api.post('/grading-scales', values);
        message.success('Grade added successfully');
      }
      closeModal();
      fetchScales();
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/grading-scales/${id}`);
      message.success('Grade deleted successfully');
      fetchScales();
    } catch (error) {
      message.error(apiError(error));
    }
  };

  const columns = [
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      width: 110,
      render: (v) => (
        <Tag color={gradeTagColor(v)} style={{ fontSize: 14, padding: '2px 12px', fontWeight: 600 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Min Score (%)',
      dataIndex: 'minScore',
      key: 'minScore',
      align: 'center',
      width: 140,
      render: (v) => parseFloat(v),
    },
    {
      title: 'Max Score (%)',
      dataIndex: 'maxScore',
      key: 'maxScore',
      align: 'center',
      width: 140,
      render: (v) => parseFloat(v),
    },
    {
      title: 'Points',
      dataIndex: 'points',
      key: 'points',
      align: 'center',
      width: 100,
      render: (v) => parseFloat(v),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete grade"
            description={`Delete grade "${record.grade}"?`}
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
      <div className="page-header">
        <Typography.Title level={2} style={{ margin: 0 }}>Grading Scale</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Add Grade
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={scales}
        columns={columns}
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: (
            <Empty
              description="No grading scale entries. Run the seed or add grades manually."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      <Modal
        title={editingScale ? `Edit Grade — ${editingScale.grade}` : 'Add Grade'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingScale ? 'Save Changes' : 'Add Grade'}
        confirmLoading={submitting}
        destroyOnClose
        width={isMobile ? '95vw' : 380}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          {!editingScale && (
            <Form.Item
              name="grade"
              label="Grade"
              normalize={(v) => v?.toUpperCase()}
              rules={[{ required: true, message: 'Grade is required' }]}
            >
              <Input placeholder="e.g. B+" maxLength={3} autoFocus />
            </Form.Item>
          )}
          <Form.Item
            name="minScore"
            label="Min Score (%)"
            rules={[
              { required: true, message: 'Min score is required' },
              { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={100} step={1} />
          </Form.Item>
          <Form.Item
            name="maxScore"
            label="Max Score (%)"
            rules={[
              { required: true, message: 'Max score is required' },
              { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={100} step={1} />
          </Form.Item>
          <Form.Item
            name="points"
            label="Points"
            rules={[
              { required: true, message: 'Points are required' },
              { type: 'number', min: 0, message: 'Points must be non-negative' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={1} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
