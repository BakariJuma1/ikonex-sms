import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Statistic, Table, Button,
  Typography, Space, Spin, message,
} from 'antd';
import {
  TeamOutlined, AppstoreOutlined, BookOutlined,
  FileTextOutlined, UserAddOutlined, PlusCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

const recentColumns = [
  {
    title: 'Admission No',
    dataIndex: 'admissionNumber',
    key: 'admissionNumber',
    width: 130,
  },
  {
    title: 'Full Name',
    key: 'fullName',
    render: (_, r) => `${r.firstName} ${r.lastName}`,
  },
  {
    title: 'Stream',
    dataIndex: ['classStream', 'name'],
    key: 'stream',
    width: 140,
  },
  {
    title: 'Registered',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    render: (v) =>
      new Date(v).toLocaleDateString('en-KE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    streams: 0,
    subjects: 0,
    scores: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [studentsRes, streamsRes, subjectsRes, scoresRes] = await Promise.all([
          api.get('/students'),
          api.get('/streams'),
          api.get('/subjects'),
          api.get('/scores'),
        ]);

        const students = studentsRes.data.data;

        setStats({
          students: students.length,
          streams: streamsRes.data.data.length,
          subjects: subjectsRes.data.data.length,
          scores: scoresRes.data.data.count,
        });

        const recent = [...students]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentStudents(recent);
      } catch (error) {
        message.error(apiError(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Typography.Title level={2} style={{ margin: '0 0 24px' }}>
        Dashboard
      </Typography.Title>

      {/* ── Stats row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Students"
              value={stats.students}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Streams"
              value={stats.streams}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Subjects"
              value={stats.subjects}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Scores Recorded"
              value={stats.scores}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Quick actions ── */}
      <Card style={{ marginBottom: 32 }} size="small">
        <Space wrap>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => navigate('/students')}
          >
            Register Student
          </Button>
          <Button
            icon={<PlusCircleOutlined />}
            onClick={() => navigate('/subjects')}
          >
            Add Subject
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate('/scores')}
          >
            Enter Scores
          </Button>
        </Space>
      </Card>

      {/* ── Recent students ── */}
      <Card title="Recently Registered Students">
        <Table
          rowKey="id"
          dataSource={recentStudents}
          columns={recentColumns}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'No students registered yet' }}
        />
      </Card>
    </>
  );
}
