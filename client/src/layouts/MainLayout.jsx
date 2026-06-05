import { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  TrophyOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/',         icon: <DashboardOutlined />,  label: 'Dashboard' },
  { key: '/streams',  icon: <AppstoreOutlined />,   label: 'Streams' },
  { key: '/students', icon: <TeamOutlined />,        label: 'Students' },
  { key: '/subjects', icon: <BookOutlined />,        label: 'Subjects' },
  { key: '/scores',   icon: <FileTextOutlined />,    label: 'Scores' },
  { key: '/results',  icon: <TrophyOutlined />,      label: 'Results' },
  { key: '/grading',  icon: <SettingOutlined />,     label: 'Grading' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Keep parent segment highlighted when on a nested route (e.g. /students/123 → /students)
  const selectedKey = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{
          height: 48,
          margin: '16px 16px 8px',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <Typography.Text strong style={{ color: '#fff', fontSize: 13, whiteSpace: 'nowrap' }}>
            {collapsed ? 'IA' : 'Ikonex Academy'}
          </Typography.Text>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            Ikonex Academy SMS
          </Typography.Title>
        </Header>

        <Content style={{ margin: 24 }}>
          <div style={{
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 360,
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
