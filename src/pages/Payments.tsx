import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  type Payment,
  type PaymentRequest,
  type PaymentListParams,
} from '../services/paymentService';
import { getRents, type Rent } from '../services/rentService';
import { useAuth } from '../context/AuthContext';

interface Filters {
  status?: string;
}

export default function Payments() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('PAYMENT_CREATE');
  const canUpdate = hasPermission('PAYMENT_UPDATE');
  const canDelete = hasPermission('PAYMENT_DELETE');

  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [sortField, setSortField] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Payment | null>(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm<Filters>();
  const [allRents, setAllRents] = useState<Rent[]>([]);

  const fetchData = useCallback(async (
    page = 0,
    size = 10,
    sort = `${sortField},${sortOrder}`,
    currentFilters = filters,
  ) => {
    setLoading(true);
    try {
      const params: PaymentListParams = { page, size, sort };
      if (currentFilters.status) params.status = currentFilters.status;

      const res = await getPayments(params);
      setData(res.content);
      setPagination((prev) => ({
        ...prev,
        current: res.number + 1,
        pageSize: res.size,
        total: res.totalElements,
      }));
    } catch {
      message.error('Ödemeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAllRents = async () => {
    try {
      const res = await getRents({ page: 0, size: 1000 });
      setAllRents(res.content);
    } catch {
      message.error('Kiralamalar yüklenemedi');
    }
  };

  const handleTableChange = (
    pag: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<Payment> | SorterResult<Payment>[],
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
    form.setFieldsValue({ currency: 'TRY' });
    fetchAllRents();
    setModalOpen(true);
  };

  const openEditModal = (record: Payment) => {
    setEditingRecord(record);
    form.setFieldsValue({
      rentId: record.rentId,
      amount: record.amount,
      currency: record.currency,
      paymentDate: dayjs(record.paymentDate),
    });
    fetchAllRents();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: PaymentRequest = {
        rentId: values.rentId,
        amount: values.amount,
        currency: values.currency,
        paymentDate: values.paymentDate.format('YYYY-MM-DDTHH:mm:ss'),
      };
      if (editingRecord) {
        await updatePayment(editingRecord.id, payload);
        message.success('Ödeme güncellendi');
      } else {
        await createPayment(payload);
        message.success('Ödeme oluşturuldu');
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
      await deletePayment(id);
      message.success('Ödeme silindi');
      fetchData((pagination.current ?? 1) - 1, pagination.pageSize ?? 10);
    } catch {
      message.error('Ödeme silinemedi');
    }
  };

  const getSortOrder = (field: string) =>
    sortField === field ? (sortOrder === 'asc' ? 'ascend' as const : 'descend' as const) : undefined;

  const columns = [
    {
      title: 'Kiralama',
      dataIndex: 'rentId',
      render: (rentId: number) => {
        const rent = allRents.find((r) => r.id === rentId);
        return rent ? rent.realEstateName : `#${rentId}`;
      },
    },
    {
      title: 'Ödeme Tarihi',
      dataIndex: 'paymentDate',
      sorter: true,
      sortOrder: getSortOrder('paymentDate'),
      render: (date: string) => new Date(date).toLocaleDateString('tr-TR'),
    },
    {
      title: 'Tutar',
      dataIndex: 'amount',
      sorter: true,
      sortOrder: getSortOrder('amount'),
      render: (amount: number, record: Payment) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: record.currency || 'TRY' }).format(amount),
    },
    {
      title: 'Para Birimi',
      dataIndex: 'currency',
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
      render: (_: unknown, record: Payment) => (
        <Space>
          {canUpdate && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Düzenle
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="Bu ödemeyi silmek istediğinize emin misiniz?"
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

  const rentOptions = allRents.map((r) => ({
    value: r.id,
    label: `${r.realEstateName} — ${new Date(r.rentDate).toLocaleDateString('tr-TR')}`,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Ödemeler</Typography.Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Yeni Ödeme
          </Button>
        )}
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={filterForm} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="status" label="Durum" style={{ marginBottom: 0 }}>
                <Select placeholder="Tümü" allowClear>
                  <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                  <Select.Option value="INACTIVE">INACTIVE</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
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
        title={editingRecord ? 'Ödeme Düzenle' : 'Yeni Ödeme'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingRecord(null); }}
        confirmLoading={saving}
        okText={editingRecord ? 'Güncelle' : 'Oluştur'}
        cancelText="İptal"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="rentId" label="Kiralama" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Select
              placeholder="Kiralama seçin..."
              showSearch
              optionFilterProp="label"
              options={rentOptions}
            />
          </Form.Item>
          <Form.Item name="paymentDate" label="Ödeme Tarihi" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="amount" label="Tutar" rules={[{ required: true, message: 'Zorunlu alan' }]}>
                <InputNumber<number>
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(value) => Number(value?.replace(/\./g, '') ?? 0)}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label="Para Birimi" rules={[{ required: true, message: 'Zorunlu alan' }]}>
                <Select>
                  <Select.Option value="TRY">TRY</Select.Option>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="EUR">EUR</Select.Option>
                  <Select.Option value="GBP">GBP</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
