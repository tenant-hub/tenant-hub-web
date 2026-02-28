import { useState } from 'react';
import { Button, Card, Form, Input, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      message.error(errorMsg || 'Kullanıcı adı veya şifre hatalı!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5',
    }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          Tenant Hub
        </Typography.Title>
        <Form onFinish={onFinish} autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: 'Kullanıcı adı gerekli' }]}>
            <Input prefix={<UserOutlined />} placeholder="Kullanıcı Adı" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Şifre gerekli' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Şifre" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Giriş Yap
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
