import { useEffect, useState } from 'react';
import { Button, Form, Input, message, Modal, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd';
import {
  getUsers,
  createUser,
  type User,
  type CreateUserRequest,
} from '../services/userService';

export default function Users() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<CreateUserRequest>();

  const fetchUsers = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await getUsers({ page, size, sort: 'username,asc' });
      setData(res.content);
      setPagination((prev) => ({
        ...prev,
        current: res.number + 1,
        pageSize: res.size,
        total: res.totalElements,
      }));
    } catch {
      message.error('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTableChange = (pag: TablePaginationConfig) => {
    fetchUsers((pag.current ?? 1) - 1, pag.pageSize ?? 10);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await createUser(values);
      message.success('Kullanıcı başarıyla oluşturuldu');
      setModalOpen(false);
      form.resetFields();
      fetchUsers((pagination.current ?? 1) - 1, pagination.pageSize ?? 10);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        message.error(axiosErr.response?.data?.message || 'Kullanıcı oluşturulamadı');
      }
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      title: 'Kullanıcı Adı',
      dataIndex: 'username',
      sorter: true,
    },
    {
      title: 'Ad',
      dataIndex: 'firstName',
    },
    {
      title: 'Soyad',
      dataIndex: 'lastName',
    },
    {
      title: 'E-posta',
      dataIndex: 'email',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Oluşturma Tarihi',
      dataIndex: 'createdDate',
      render: (date: string) => new Date(date).toLocaleDateString('tr-TR'),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Kullanıcılar</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Yeni Kullanıcı
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
      />

      <Modal
        title="Yeni Kullanıcı"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={creating}
        okText="Oluştur"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Kullanıcı Adı" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email', message: 'Geçerli e-posta girin' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 8, message: 'En az 8 karakter' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="firstName" label="Ad" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Soyad" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
