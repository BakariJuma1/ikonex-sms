import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Statistic, Table, Button,
  Typography, Space, Spin, message, Progress, Tag, Empty,
} from 'antd';
import {
  TeamOutlined, AppstoreOutlined, BookOutlined,
  FileTextOutlined, UserAddOutlined, PlusCircleOutlined,
  EditOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';

const GRADE_COLORS = { A: 'green', B: 'blue', C: 'gold', D: 'volcano', E: 'red' };
const gradeTagColor = (g) => GRADE_COLORS[g?.[0]] ?? 'default';
const round2 = (n) => Math.round(n * 100) / 100;
const barColor = (score) => (score >= 60 ? '#52c41a' : score >= 40 ? '#fa8c16' : '#ff4d4f');

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

const recentColumns = [
  { title: 'Admission No', dataIndex: 'admissionNumber', key: 'admissionNumber', width: 130 },
  {
    title: 'Full Name',
    key: 'fullName',
    render: (_, r) => `${r.firstName} ${r.lastName}`,
  },
  { title: 'Stream', dataIndex: ['classStream', 'name'], key: 'stream', width: 140 },
  {
    title: 'Registered',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    render: (v) =>
      new Date(v).toLocaleDateString('en-KE', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
  },
];

const topStudentColumns = [
  { title: '#', dataIndex: 'rank', key: 'rank', width: 44, align: 'center' },
  {
    title: 'Full Name',
    key: 'fullName',
    render: (_, r) => `${r.firstName} ${r.lastName}`,
  },
  { title: 'Stream', dataIndex: 'streamName', key: 'stream', width: 100 },
  {
    title: 'Mean Score',
    dataIndex: 'meanScore',
    key: 'meanScore',
    align: 'center',
    width: 110,
    render: (v) => `${v}%`,
  },
  {
    title: 'Grade',
    dataIndex: 'overallGrade',
    key: 'grade',
    align: 'center',
    width: 72,
    render: (g) => (
      <Tag color={gradeTagColor(g)} style={{ fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
        {g}
      </Tag>
    ),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, streams: 0, subjects: 0, scores: 0 });
  const [expectedScores, setExpectedScores] = useState(0);
  const [recentStudents, setRecentStudents] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [subjectAverages, setSubjectAverages] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [studentsRes, streamsRes, subjectsRes, scoresRes, topRes, avgRes] = await Promise.all([
          api.get('/students'),
          api.get('/streams'),
          api.get('/subjects'),
          api.get('/scores'),
          api.get('/results/top-students?limit=5'),
          api.get('/results/subject-averages'),
        ]);

        const students = studentsRes.data.data;
        const streams = streamsRes.data.data;

        const expected = streams.reduce(
          (sum, s) => sum + s._count.students * s._count.streamSubjects * 2,
          0
        );

        setStats({
          students: students.length,
          streams: streams.length,
          subjects: subjectsRes.data.data.length,
          scores: scoresRes.data.data.count,
        });
        setExpectedScores(expected);

        const recent = [...students]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentStudents(recent);
        setTopStudents(topRes.data.data);
        setSubjectAverages(avgRes.data.data);
      } catch (error) {
        message.error(apiError(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const progressPercent =
    expectedScores > 0
      ? Math.min(round2((stats.scores / expectedScores) * 100), 100)
      : 0;
  const progressStroke =
    progressPercent >= 100
      ? '#52c41a'
      : progressPercent >= 60
      ? '#1677ff'
      : progressPercent >= 30
      ? '#faad14'
      : '#ff4d4f';

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
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Students" value={stats.students} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Streams" value={stats.streams} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Subjects" value={stats.subjects} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Scores Recorded" value={stats.scores} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* ── Score entry progress ── */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>Score Entry Progress</Typography.Text>
          <Typography.Text type="secondary">
            {stats.scores} of {expectedScores} expected scores recorded
          </Typography.Text>
        </div>
        <Progress
          percent={progressPercent}
          strokeColor={progressStroke}
          strokeWidth={14}
          status={progressPercent >= 100 ? 'success' : 'active'}
          format={(pct) => `${pct}%`}
        />
      </Card>

      {/* ── Quick actions ── */}
      <Card style={{ marginBottom: 24 }} size="small">
        <Space wrap>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => navigate('/students')}
          >
            Register Student
          </Button>
          <Button icon={<PlusCircleOutlined />} onClick={() => navigate('/subjects')}>
            Add Subject
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate('/scores')}>
            Enter Scores
          </Button>
        </Space>
      </Card>

      {/* ── Top students + Subject averages ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                Top 5 Students
              </Space>
            }
            style={{ height: '100%' }}
          >
            <Table
              rowKey="id"
              dataSource={topStudents}
              columns={topStudentColumns}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <Empty
                    description="No scores recorded yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Subject Average Scores" style={{ height: '100%' }}>
            {subjectAverages.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                <Empty
                  description="No scores recorded yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={subjectAverages}
                  margin={{ top: 8, right: 16, left: -10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" width={50} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Avg Score']}
                    labelFormatter={(code) => {
                      const subj = subjectAverages.find((s) => s.code === code);
                      return subj ? `${subj.name} (${code})` : code;
                    }}
                  />
                  <Bar dataKey="averageScore" radius={[4, 4, 0, 0]}>
                    {subjectAverages.map((entry, idx) => (
                      <Cell key={idx} fill={barColor(entry.averageScore)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Recent students ── */}
      <Card title="Recently Registered Students">
        <Table
          rowKey="id"
          dataSource={recentStudents}
          columns={recentColumns}
          pagination={false}
          size="middle"
          scroll={{ x: true }}
          locale={{ emptyText: 'No students registered yet' }}
        />
      </Card>
    </>
  );
}
