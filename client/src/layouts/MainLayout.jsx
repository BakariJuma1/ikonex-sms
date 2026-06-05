import { useState } from 'react';
import { Layout, Menu, Typography, Button, Grid } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  TrophyOutlined,
  SettingOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;
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
  // Start collapsed on mobile to avoid flash
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 992);
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isMobile = screens.lg === false;

  const selectedKey = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;

  const handleMenuClick = ({ key }) => {
    navigate(key);
    // Auto-close sider after navigation on mobile
    if (isMobile) setCollapsed(true);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Dark overlay — closes sider when tapped outside on mobile */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 199,
          }}
        />
      )}

      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        collapsible={!isMobile}
        onCollapse={setCollapsed}
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={isMobile ? {
          position: 'fixed',
          height: '100vh',
          top: 0,
          left: 0,
          zIndex: 200,
        } : {}}
      >
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
            Ikonex Academy
          </Typography.Text>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 18 }} />}
              onClick={() => setCollapsed((c) => !c)}
              style={{ marginRight: 8 }}
            />
          )}
          <Typography.Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            Ikonex Academy SMS
          </Typography.Title>
        </Header>

        <Content style={{ margin: isMobile ? 8 : 24 }}>
          <div style={{
            padding: isMobile ? 12 : 24,
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
