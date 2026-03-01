import { useMemo, useState } from 'react';
import { Layout, Menu, Button, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  SafetyOutlined,
  CrownOutlined,
  HomeOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  icon: ReactNode;
  label: string;
  requiredPermission?: string;
}

const allMenuItems: MenuItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/users', icon: <UserOutlined />, label: 'Kullanıcılar', requiredPermission: 'USER_READ' },
  { key: '/roles', icon: <CrownOutlined />, label: 'Roller', requiredPermission: 'ROLES_READ' },
  { key: '/permissions', icon: <SafetyOutlined />, label: 'Yetkiler', requiredPermission: 'PERMISSION_READ' },
  { key: '/real-estates', icon: <HomeOutlined />, label: 'Gayrimenkuller', requiredPermission: 'REAL_ESTATE_READ' },
  { key: '/tenants', icon: <TeamOutlined />, label: 'Kiracılar', requiredPermission: 'TENANT_READ' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Ayarlar' },
];

export default function MainLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const menuItems = useMemo(
    () => allMenuItems.filter((item) => !item.requiredPermission || hasPermission(item.requiredPermission)),
    [hasPermission],
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold',
        }}>
          {collapsed ? 'TH' : 'Tenant Hub'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Typography.Text strong>{user.username}</Typography.Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
            >
              Çıkış
            </Button>
          </div>
        </Header>
        <Content style={{
          margin: 24,
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
