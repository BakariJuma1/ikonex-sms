import { useState, useEffect } from 'react';
import {
  Tabs, Select, Table, Descriptions, Statistic,
  Button, Tag, Typography, Space, Row, Col,
  Spin, message, Divider, Empty, Grid,
} from 'antd';

import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import api from '../api/axios';

const { useBreakpoint } = Grid;
const { Option } = Select;

const GRADE_COLORS = { A: 'green', B: 'blue', C: 'gold', D: 'volcano', E: 'red' };
const gradeColor = (g) => GRADE_COLORS[g] ?? 'default';

const apiError = (error) =>
  error.response?.data?.errors?.join(', ') ||
  error.response?.data?.error ||
  'An unexpected error occurred';

async function triggerPdfDownload(url, filename) {
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
}

export default function Results() {
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;

  // ── Student tab ───────────────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentResult, setStudentResult] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentPdfLoading, setStudentPdfLoading] = useState(false);

  // ── Class tab ─────────────────────────────────────────────────────────────
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState(null);
  const [streamResult, setStreamResult] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamPdfLoading, setStreamPdfLoading] = useState(false);
  const [reportLoadingMap, setReportLoadingMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [studentsRes, streamsRes] = await Promise.all([
          api.get('/students'),
          api.get('/streams'),
        ]);
        setStudents(studentsRes.data.data);
        setStreams(streamsRes.data.data);
      } catch (error) {
        message.error(apiError(error));
      }
    })();
  }, []);

  // ── Student tab handlers ──────────────────────────────────────────────────

  const handleStudentChange = async (studentId) => {
    setSelectedStudentId(studentId ?? null);
    setStudentResult(null);
    if (!studentId) return;

    setStudentLoading(true);
    try {
      const { data } = await api.get(`/results/student/${studentId}`);
      setStudentResult(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setStudentLoading(false);
    }
  };

  const handleStudentPdfDownload = async () => {
    setStudentPdfLoading(true);
    try {
      const { firstName, lastName } = studentResult.student;
      await triggerPdfDownload(
        `/pdf/student/${selectedStudentId}`,
        `${firstName}_${lastName}_report_card.pdf`
      );
    } catch {
      message.error('Failed to download report card');
    } finally {
      setStudentPdfLoading(false);
    }
  };

  // ── Class tab handlers ────────────────────────────────────────────────────

  const handleStreamChange = async (streamId) => {
    setSelectedStreamId(streamId ?? null);
    setStreamResult(null);
    if (!streamId) return;

    setStreamLoading(true);
    try {
      const { data } = await api.get(`/results/stream/${streamId}`);
      setStreamResult(data.data);
    } catch (error) {
      message.error(apiError(error));
    } finally {
      setStreamLoading(false);
    }
  };

  const handleStreamPdfDownload = async () => {
    setStreamPdfLoading(true);
    try {
      await triggerPdfDownload(
        `/pdf/stream/${selectedStreamId}`,
        `${streamResult.stream.name}_class_report.pdf`
      );
    } catch {
      message.error('Failed to download class report');
    } finally {
      setStreamPdfLoading(false);
    }
  };

  const handleStudentReportDownload = async (student) => {
    setReportLoadingMap((prev) => ({ ...prev, [student.id]: true }));
    try {
      await triggerPdfDownload(
        `/pdf/student/${student.id}`,
        `${student.firstName}_${student.lastName}_report_card.pdf`
      );
    } catch {
      message.error('Failed to download report card');
    } finally {
      setReportLoadingMap((prev) => ({ ...prev, [student.id]: false }));
    }
  };

  // ── Subject breakdown columns (student tab) ───────────────────────────────

  const subjectColumns = [
    {
      title: 'Subject',
      key: 'subject',
      render: (_, r) => `${r.subject.name} (${r.subject.code})`,
    },
    {
      title: 'EXAM',
      key: 'exam',
      align: 'center',
      width: 80,
      render: (_, r) =>
        r.examMarks != null
          ? r.examMarks
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'CAT',
      key: 'cat',
      align: 'center',
      width: 80,
      render: (_, r) =>
        r.catMarks != null
          ? r.catMarks
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Final Score',
      dataIndex: 'totalMarks',
      key: 'finalScore',
      align: 'center',
      width: 120,
      render: (v) => `${v} / 100`,
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      align: 'center',
      width: 80,
      render: (v) => <Tag color={gradeColor(v)}>{v}</Tag>,
    },
  ];

  // ── Class results columns ─────────────────────────────────────────────────

  const classColumns = [
    {
      title: '#',
      dataIndex: 'classPosition',
      key: 'classPosition',
      align: 'center',
      width: 60,
      render: (pos) => <Typography.Text strong>{pos}</Typography.Text>,
    },
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
      width: 80,
      render: (v) => <Tag color={gradeColor(v)}>{v}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 130,
      render: (_, record) => (
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          loading={reportLoadingMap[record.id]}
          onClick={() => handleStudentReportDownload(record)}
        >
          Report Card
        </Button>
      ),
    },
  ];

  // ── Empty state placeholder ───────────────────────────────────────────────

  const EmptyPlaceholder = ({ text }) => (
    <div style={{
      padding: '56px 0',
      textAlign: 'center',
      border: '1px dashed #d9d9d9',
      borderRadius: 8,
    }}>
      <Typography.Text type="secondary">{text}</Typography.Text>
    </div>
  );

  // ── Tab: Student Results ──────────────────────────────────────────────────

  const studentTab = (
    <>
      <div style={{ marginBottom: 20 }}>
        <Select
          showSearch
          placeholder="Search by name or admission number"
          style={{ width: '100%', maxWidth: 400 }}
          value={selectedStudentId}
          onChange={handleStudentChange}
          allowClear
          filterOption={(input, option) =>
            option.searchtext.toLowerCase().includes(input.toLowerCase())
          }
        >
          {students.map((s) => (
            <Option
              key={s.id}
              value={s.id}
              searchtext={`${s.firstName} ${s.lastName} ${s.admissionNumber}`}
            >
              {s.firstName} {s.lastName}
              <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {s.admissionNumber}
              </Typography.Text>
            </Option>
          ))}
        </Select>
      </div>

      {studentLoading && (
        <div style={{ textAlign: 'center', paddingTop: 64 }}>
          <Spin size="large" />
        </div>
      )}

      {!studentLoading && !selectedStudentId && (
        <EmptyPlaceholder text="Select a student above to view their results" />
      )}

      {!studentLoading && studentResult && (
        <>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 20,
          }}>
            <Descriptions
              bordered
              size="small"
              column={isMobile ? 1 : 2}
              style={{ flex: 1 }}
            >
              <Descriptions.Item label="Full Name">
                {studentResult.student.firstName} {studentResult.student.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Admission No">
                {studentResult.student.admissionNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Stream">
                {studentResult.student.classStream.name}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {studentResult.student.gender || '—'}
              </Descriptions.Item>
            </Descriptions>

            <Button
              icon={<DownloadOutlined />}
              loading={studentPdfLoading}
              onClick={handleStudentPdfDownload}
            >
              Download Report Card
            </Button>
          </div>

          <Divider orientation="left">Subject Breakdown</Divider>

          {studentResult.subjects.length === 0 ? (
            <Empty description="No scores recorded yet" style={{ margin: '24px 0' }} />
          ) : (
            <>
              <Table
                rowKey={(r) => r.subject.id}
                dataSource={studentResult.subjects}
                columns={subjectColumns}
                size="middle"
                pagination={false}
                scroll={{ x: 'max-content' }}
                style={{ marginBottom: 32 }}
              />

              <Row gutter={24}>
                <Col xs={8}>
                  <Statistic
                    title="Mean Score"
                    value={studentResult.overall.meanScore}
                    suffix="%"
                  />
                </Col>
                <Col xs={8}>
                  <Statistic
                    title="Overall Grade"
                    value={studentResult.overall.overallGrade}
                    valueStyle={{
                      color: GRADE_COLORS[studentResult.overall.overallGrade] ?? '#222',
                    }}
                  />
                </Col>
                <Col xs={8}>
                  <Statistic
                    title="Class Position"
                    value={studentResult.overall.classPosition}
                    suffix={`/ ${studentResult.overall.totalStudentsInStream}`}
                  />
                </Col>
              </Row>
            </>
          )}
        </>
      )}
    </>
  );

  // ── Tab: Class Results ────────────────────────────────────────────────────

  const classTab = (
    <>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
      }}>
        <Select
          placeholder="Select a stream"
          style={{ width: '100%', maxWidth: 260 }}
          value={selectedStreamId}
          onChange={handleStreamChange}
          allowClear
        >
          {streams.map((s) => (
            <Option key={s.id} value={s.id}>{s.name}</Option>
          ))}
        </Select>

        {streamResult && (
          <Button
            icon={<DownloadOutlined />}
            loading={streamPdfLoading}
            onClick={handleStreamPdfDownload}
          >
            Download Class Report
          </Button>
        )}
      </div>

      {streamLoading && (
        <div style={{ textAlign: 'center', paddingTop: 64 }}>
          <Spin size="large" />
        </div>
      )}

      {!streamLoading && !selectedStreamId && (
        <EmptyPlaceholder text="Select a stream above to view class results" />
      )}

      {!streamLoading && streamResult && (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {streamResult.stream.name} &mdash; {streamResult.totalStudents} student
            {streamResult.totalStudents !== 1 ? 's' : ''}
          </Typography.Text>

          <Table
            rowKey="id"
            dataSource={streamResult.students}
            columns={classColumns}
            size="middle"
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Typography.Title level={2} style={{ margin: '0 0 16px' }}>Results</Typography.Title>
      <Tabs
        items={[
          { key: 'student', label: 'Student Results', children: studentTab },
          { key: 'class', label: 'Class Results', children: classTab },
        ]}
      />
    </>
  );
}
