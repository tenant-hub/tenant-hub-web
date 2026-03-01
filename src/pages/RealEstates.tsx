import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import {
  getRealEstates,
  createRealEstate,
  updateRealEstate,
  deleteRealEstate,
  type RealEstate,
  type RealEstateRequest,
  type RealEstateListParams,
} from '../services/realEstateService';
import { getUsers, type User } from '../services/userService';
import { useAuth } from '../context/AuthContext';

interface Filters {
  name?: string;
  type?: string;
  province?: string;
  status?: string;
}

export default function RealEstates() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('REAL_ESTATE_CREATE');
  const canUpdate = hasPermission('REAL_ESTATE_UPDATE');
  const canDelete = hasPermission('REAL_ESTATE_DELETE');

  const [data, setData] = useState<RealEstate[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RealEstate | null>(null);
  const [form] = Form.useForm<RealEstateRequest>();
  const [filterForm] = Form.useForm<Filters>();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const fetchData = useCallback(async (
    page = 0,
    size = 10,
    sort = `${sortField},${sortOrder}`,
    currentFilters = filters,
  ) => {
    setLoading(true);
    try {
      const params: RealEstateListParams = { page, size, sort };
      if (currentFilters.name) params.name = currentFilters.name;
      if (currentFilters.type) params.type = currentFilters.type;
      if (currentFilters.province) params.province = currentFilters.province;
      if (currentFilters.status) params.status = currentFilters.status;

      const res = await getRealEstates(params);
      setData(res.content);
      setPagination((prev) => ({
        ...prev,
        current: res.number + 1,
        pageSize: res.size,
        total: res.totalElements,
      }));
    } catch {
      message.error('Gayrimenkuller yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAllUsers = async () => {
    try {
      const res = await getUsers({ page: 0, size: 1000 });
      setAllUsers(res.content);
    } catch {
      message.error('Kullanıcılar yüklenemedi');
    }
  };

  const handleTableChange = (
    pag: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<RealEstate> | SorterResult<RealEstate>[],
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newField = (s.field as string) || sortField;
    const newOrder = s.order === 'descend' ? 'desc' : 'asc';
    setSortField(newField);
    setSortOrder(newOrder);
    fetchData((pag.current ?? 1) - 1, pag.pageSize ?? 10, `${newField},${newOrder}`, filters);
  };

  const handleFilterSearch = () => {
    const values = filterForm.getFieldsValue();
    setFilters(values);
    fetchData(0, pagination.pageSize ?? 10, `${sortField},${sortOrder}`, values);
  };

  const handleFilterReset = () => {
    filterForm.resetFields();
    setFilters({});
    fetchData(0, pagination.pageSize ?? 10, `${sortField},${sortOrder}`, {});
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    fetchAllUsers();
    setModalOpen(true);
  };

  const openEditModal = (record: RealEstate) => {
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type,
      province: record.province,
      district: record.district,
      neighborhood: record.neighborhood,
      address: record.address,
      tenantId: record.tenantId,
      landlordId: record.landlordId,
    });
    fetchAllUsers();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingRecord) {
        await updateRealEstate(editingRecord.id, values);
        message.success('Gayrimenkul güncellendi');
      } else {
        await createRealEstate(values);
        message.success('Gayrimenkul oluşturuldu');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingRecord(null);
      fetchData((pagination.current ?? 1) - 1, pagination.pageSize ?? 10);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        message.error(axiosErr.response?.data?.message || 'İşlem başarısız');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRealEstate(id);
      message.success('Gayrimenkul silindi');
      fetchData((pagination.current ?? 1) - 1, pagination.pageSize ?? 10);
    } catch {
      message.error('Gayrimenkul silinemedi');
    }
  };

  const getSortOrder = (field: string) =>
    sortField === field ? (sortOrder === 'asc' ? 'ascend' as const : 'descend' as const) : undefined;

  const columns = [
    {
      title: 'Gayrimenkul Adı',
      dataIndex: 'name',
      sorter: true,
      sortOrder: getSortOrder('name'),
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      render: (text: string) =>
        text && text.length > 50 ? (
          <Tooltip title={text}>
            <span>{text.slice(0, 50)}...</span>
          </Tooltip>
        ) : (
          text
        ),
    },
    {
      title: 'Tip',
      dataIndex: 'type',
      sorter: true,
      sortOrder: getSortOrder('type'),
    },
    {
      title: 'İl',
      dataIndex: 'province',
      sorter: true,
      sortOrder: getSortOrder('province'),
    },
    {
      title: 'İlçe',
      dataIndex: 'district',
      sorter: true,
      sortOrder: getSortOrder('district'),
    },
    {
      title: 'Mahalle',
      dataIndex: 'neighborhood',
    },
    {
      title: 'Kiracı',
      dataIndex: 'tenantName',
      render: (name: string | null) => name || '-',
    },
    {
      title: 'Ev Sahibi',
      dataIndex: 'landlordName',
      render: (name: string | null) => name || '-',
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      sorter: true,
      sortOrder: getSortOrder('status'),
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Oluşturma Tarihi',
      dataIndex: 'createdDate',
      sorter: true,
      sortOrder: getSortOrder('createdDate'),
      render: (date: string) => new Date(date).toLocaleDateString('tr-TR'),
    },
    {
      title: 'Oluşturan',
      dataIndex: 'createdBy',
    },
    ...((canUpdate || canDelete) ? [{
      title: 'İşlemler',
      render: (_: unknown, record: RealEstate) => (
        <Space>
          {canUpdate && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Düzenle
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="Bu gayrimenkulü silmek istediğinize emin misiniz?"
              onConfirm={() => handleDelete(record.id)}
              okText="Evet"
              cancelText="Hayır"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Sil
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const userOptions = allUsers.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName} (${u.username})`,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Gayrimenkuller</Typography.Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Yeni Gayrimenkul
          </Button>
        )}
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={filterForm} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="name" label="Gayrimenkul Adı" style={{ marginBottom: 0 }}>
                <Input placeholder="Ara..." allowClear />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="type" label="Tip" style={{ marginBottom: 0 }}>
                <Input placeholder="Ara..." allowClear />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="province" label="İl" style={{ marginBottom: 0 }}>
                <Input placeholder="Ara..." allowClear />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="status" label="Durum" style={{ marginBottom: 0 }}>
                <Select placeholder="Tümü" allowClear>
                  <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                  <Select.Option value="INACTIVE">INACTIVE</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleFilterSearch}>
                  Ara
                </Button>
                <Button icon={<ClearOutlined />} onClick={handleFilterReset}>
                  Temizle
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
      />

      <Modal
        title={editingRecord ? 'Gayrimenkul Düzenle' : 'Yeni Gayrimenkul'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingRecord(null); }}
        confirmLoading={saving}
        okText={editingRecord ? 'Güncelle' : 'Oluştur'}
        cancelText="İptal"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Gayrimenkul Adı" rules={[{ required: true, message: 'Zorunlu alan' }, { max: 200, message: 'En fazla 200 karakter' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Açıklama" rules={[{ max: 1000, message: 'En fazla 1000 karakter' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="type" label="Tip" rules={[{ required: true, message: 'Zorunlu alan' }, { max: 50, message: 'En fazla 50 karakter' }]}>
            <Input placeholder="Örn: Daire, Villa, Arsa" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label="İl" rules={[{ required: true, message: 'Zorunlu alan' }, { max: 100, message: 'En fazla 100 karakter' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="İlçe" rules={[{ required: true, message: 'Zorunlu alan' }, { max: 100, message: 'En fazla 100 karakter' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="neighborhood" label="Mahalle" rules={[{ required: true, message: 'Zorunlu alan' }, { max: 100, message: 'En fazla 100 karakter' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Adres" rules={[{ required: true, message: 'Zorunlu alan' }, { max: 500, message: 'En fazla 500 karakter' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tenantId" label="Kiracı">
                <Select
                  placeholder="Kiracı seçin..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={userOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="landlordId" label="Ev Sahibi">
                <Select
                  placeholder="Ev sahibi seçin..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={userOptions}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
