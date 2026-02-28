import { Card, Typography } from 'antd';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <Typography.Title level={3}>Dashboard</Typography.Title>
      <Card>
        <Typography.Text>
          Hoş geldiniz, <strong>{user?.username}</strong>! Tenant Hub yönetim paneline başarıyla giriş yaptınız.
        </Typography.Text>
      </Card>
    </div>
  );
}
