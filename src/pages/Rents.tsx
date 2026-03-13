import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import {
  getRents,
  createRent,
  updateRent,
  deleteRent,
  type Rent,
  type RentRequest,
  type RentListParams,
} from '../services/rentService';
import { getRealEstates, type RealEstate } from '../services/realEstateService';
import { useAuth } from '../context/AuthContext';

interface Filters {
  status?: string;
}

export default function Rents() {
  const { hasPermission, user } = useAuth();
  const canCreate = hasPermission('RENT_CREATE');
  const canUpdate = hasPermission('RENT_UPDATE');
  const canDelete = hasPermission('RENT_DELETE');
  const canEditZamOrani = user?.roles.includes('ADMIN') || user?.roles.includes('MANAGER');

  const [data, setData] = useState<Rent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [sortField, setSortField] = useState('rentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Rent | null>(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm<Filters>();
  const [allRealEstates, setAllRealEstates] = useState<RealEstate[]>([]);

  const fetchData = useCallback(async (
    page = 0,
    size = 10,
    sort = `${sortField},${sortOrder}`,
    currentFilters = filters,
  ) => {
    setLoading(true);
    try {
      const params: RentListParams = { page, size, sort };
      if (currentFilters.status) params.status = currentFilters.status;

      const res = await getRents(params);
      setData(res.content);
      setPagination((prev) => ({
        ...prev,
        current: res.number + 1,
        pageSize: res.size,
        total: res.totalElements,
      }));
    } catch {
      message.error('Kiralamalar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAllRealEstates = async () => {
    try {
      const res = await getRealEstates({ page: 0, size: 1000 });
      setAllRealEstates(res.content);
    } catch {
      message.error('Gayrimenkuller yüklenemedi');
    }
  };

  const handleTableChange = (
    pag: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<Rent> | SorterResult<Rent>[],
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
    fetchAllRealEstates();
    setModalOpen(true);
  };

  const openEditModal = (record: Rent) => {
    setEditingRecord(record);
    form.setFieldsValue({
      realEstateId: record.realEstateId,
      rentDate: dayjs(record.rentDate),
      rentAmount: record.rentAmount,
      currency: record.currency,
      zamOrani: record.zamOrani ?? null,
    });
    fetchAllRealEstates();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: RentRequest = {
        realEstateId: values.realEstateId,
        rentDate: values.rentDate.format('YYYY-MM-DDTHH:mm:ss'),
        rentAmount: values.rentAmount,
        currency: values.currency,
        zamOrani: values.zamOrani ?? undefined,
      };
      if (editingRecord) {
        await updateRent(editingRecord.id, payload);
        message.success('Kiralama güncellendi');
      } else {
        await createRent(payload);
        message.success('Kiralama oluşturuldu');
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
      await deleteRent(id);
      message.success('Kiralama silindi');
      fetchData((pagination.current ?? 1) - 1, pagination.pageSize ?? 10);
    } catch {
      message.error('Kiralama silinemedi');
    }
  };

  const getSortOrder = (field: string) =>
    sortField === field ? (sortOrder === 'asc' ? 'ascend' as const : 'descend' as const) : undefined;

  const columns = [
    {
      title: 'Gayrimenkul',
      dataIndex: 'realEstateName',
      sorter: true,
      sortOrder: getSortOrder('realEstateName'),
    },
    {
      title: 'Kira Tarihi',
      dataIndex: 'rentDate',
      sorter: true,
      sortOrder: getSortOrder('rentDate'),
      render: (date: string) => new Date(date).toLocaleDateString('tr-TR'),
    },
    {
      title: 'Kira Tutarı',
      dataIndex: 'rentAmount',
      sorter: true,
      sortOrder: getSortOrder('rentAmount'),
      render: (amount: number, record: Rent) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: record.currency || 'TRY' }).format(amount),
    },
    {
      title: 'Para Birimi',
      dataIndex: 'currency',
    },
    {
      title: 'Zam Oranı',
      dataIndex: 'zamOrani',
      sorter: true,
      sortOrder: getSortOrder('zamOrani'),
      render: (value: number | null) =>
        value != null
          ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + '%'
          : '-',
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
      render: (_: unknown, record: Rent) => (
        <Space>
          {canUpdate && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Düzenle
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="Bu kiralamayı silmek istediğinize emin misiniz?"
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

  const realEstateOptions = allRealEstates.map((re) => ({
    value: re.id,
    label: re.name,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Kiralama</Typography.Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Yeni Kiralama
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
        title={editingRecord ? 'Kiralama Düzenle' : 'Yeni Kiralama'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingRecord(null); }}
        confirmLoading={saving}
        okText={editingRecord ? 'Güncelle' : 'Oluştur'}
        cancelText="İptal"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="realEstateId" label="Gayrimenkul" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Select
              placeholder="Gayrimenkul seçin..."
              showSearch
              optionFilterProp="label"
              options={realEstateOptions}
            />
          </Form.Item>
          <Form.Item name="rentDate" label="Kira Tarihi" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="rentAmount" label="Kira Tutarı" rules={[{ required: true, message: 'Zorunlu alan' }]}>
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
          <Form.Item
            name="zamOrani"
            label="Zam Oranı (%)"
            rules={[
              {
                type: 'number',
                min: 0,
                max: 100,
                message: 'Zam oranı 0-100 arasında olmalıdır',
              },
            ]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              addonAfter="%"
              disabled={!canEditZamOrani}
              placeholder="Opsiyonel"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
