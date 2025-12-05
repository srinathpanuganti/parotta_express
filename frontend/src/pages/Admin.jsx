import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Eye, EyeOff, AlertTriangle, CheckCircle2, Plus, Edit2, Trash2, X, Calendar as CalendarIcon, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
// PDF export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const apiBase = process.env.REACT_APP_API_BASE || '';

// Secure token management (memory-only in this version)
function useAdminToken() {
  const [token, setToken] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  
  const save = useCallback((t) => {
    setToken(t);
    setIsValidated(false);
  }, []);
  
  const validate = useCallback(async () => {
    if (!token) return false;
    try {
      const res = await fetch(`${apiBase}/api/admin/verify`, { headers: { 'X-Admin-Token': token } });
      if (res.ok) {
        setIsValidated(true);
        return true;
      }
      setIsValidated(false);
      return false;
    } catch (_) {
      setIsValidated(false);
      return false;
    }
  }, [token]);
  
  return { token, save, isValidated, validate };
}

// Confirmation dialog hook
function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({ title: '', description: '', onConfirm: () => {} });
  
  const confirm = useCallback((title, description, onConfirm) => {
    setConfig({ title, description, onConfirm });
    setIsOpen(true);
  }, []);
  
  const handleConfirm = useCallback(() => {
    config.onConfirm();
    setIsOpen(false);
  }, [config]);
  
  return { isOpen, setIsOpen, confirm, handleConfirm, config };
}

const Admin = () => {
  const { toast } = useToast();
  const { token, save, isValidated, validate } = useAdminToken();
  const { isOpen, setIsOpen, confirm, handleConfirm, config } = useConfirmDialog();
  const [showToken, setShowToken] = useState(false);
  
  const headers = useMemo(() => ({ 
    'Content-Type': 'application/json', 
    'X-Admin-Token': token 
  }), [token]);
  
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOperations, setActiveOperations] = useState(new Set());

  // Forms with validation
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [catErrors, setCatErrors] = useState({});
  const [editCat, setEditCat] = useState({ id: '', name: '', description: '' });
  const [newItem, setNewItem] = useState({ categoryId: '', name: '', price: '', available: true });
  const [itemErrors, setItemErrors] = useState({});
  const [editItem, setEditItem] = useState({ id: '', name: '', price: '', available: true });
  // Dialog visibility
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  // Reports
  const [reportDate, setReportDate] = useState(new Date());
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  // Order window config
  const [owLoading, setOwLoading] = useState(false);
  const [owTZ, setOwTZ] = useState('');
  const [owStart, setOwStart] = useState('00:05');
  const [owEnd, setOwEnd] = useState('10:45');

  const addOperation = (id) => setActiveOperations(prev => new Set(prev).add(id));
  const removeOperation = (id) => setActiveOperations(prev => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });

  const validateCategory = (data) => {
    const errors = {};
    if (!data.name.trim()) errors.name = 'Name is required';
    if (data.name.length > 100) errors.name = 'Name too long';
    return errors;
  };

  const validateItem = (data) => {
    const errors = {};
    if (!data.name.trim()) errors.name = 'Name is required';
    if (!data.categoryId) errors.categoryId = 'Category is required';
    const price = Number(data.price);
    if (isNaN(price) || price < 0) errors.price = 'Valid price required';
    if (price > 999999) errors.price = 'Price too high';
    return errors;
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/corporate/menu`);
      if (res.ok) {
        const data = await res.json();
        setMenu(data);
        toast({ 
          title: 'Menu loaded', 
          description: `${data.categories?.length || 0} categories found`,
          duration: 2000
        });
      } else {
        toast({ 
          title: 'Failed to load menu', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Network error', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMenu();
  }, []);

  const handleValidateToken = async () => {
    const ok = await validate();
    if (ok) {
      toast({ title: 'Admin token validated', description: 'You can now access admin features', duration: 2000 });
      void loadOrderWindow();
    } else {
      toast({ title: 'Invalid admin token', variant: 'destructive' });
    }
  };

  const minutesToHHMM = (m) => {
    const h = String(Math.floor(Number(m) / 60)).padStart(2, '0');
    const mm = String(Number(m) % 60).padStart(2, '0');
    return `${h}:${mm}`;
  };

  const hhmmToMinutes = (s) => {
    const [h, m] = String(s).split(':').map((n) => Number(n));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const loadOrderWindow = async () => {
    if (!token) return;
    setOwLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/config/order-window`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOwTZ(data.timeZone || '');
        setOwStart(minutesToHHMM(data.startMin));
        setOwEnd(minutesToHHMM(data.endMin));
      }
    } finally {
      setOwLoading(false);
    }
  };

  useEffect(() => {
    if (isValidated) {
      void loadOrderWindow();
    }
    // Note: deliberately not including headers/token dependencies to avoid unnecessary reloads
    // when typing token; loads only after validation success.
    // eslint-disable-next-line
  }, [isValidated]);

  const saveOrderWindow = async () => {
    if (!token) return;
    const startMin = hhmmToMinutes(owStart);
    const endMin = hhmmToMinutes(owEnd);
    if (startMin == null || endMin == null) {
      toast({ title: 'Enter valid times', variant: 'destructive' });
      return;
    }
    if (!(startMin < endMin)) {
      toast({ title: 'Start must be less than end', variant: 'destructive' });
      return;
    }
    setOwLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/config/order-window`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ startMin, endMin }),
      });
      if (res.ok) {
        toast({ title: 'Ordering window updated' });
        void loadOrderWindow();
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ title: 'Failed to update', description: e.error || 'Error', variant: 'destructive' });
      }
    } finally {
      setOwLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!token) {
      toast({ title: 'Admin token required', variant: 'destructive' });
      return;
    }
    setReportLoading(true);
    try {
      const dateStr = format(reportDate, 'yyyy-MM-dd');
      const res = await fetch(`${apiBase}/api/admin/reports/orders?date=${dateStr}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        toast({ title: 'Report loaded', description: `${data.count} orders on ${dateStr}`, duration: 2000 });
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ title: 'Failed to load report', description: e.error || 'Error', variant: 'destructive' });
      }
    } finally {
      setReportLoading(false);
    }
  };

  const toCurrency = (n) => `$${Number(n).toFixed(2)}`;

  const exportCSV = () => {
    if (!report?.orders) return;
    const rows = [];
    rows.push(['Order ID', 'Created At', 'User', 'Email', 'Phone', 'Address', 'Status', 'Total', 'Notes', 'Items']);
    report.orders.forEach((o) => {
      const itemsStr = (o.items || [])
        .map((it) => `${it.nameSnapshot} x${it.quantity} = ${toCurrency(Number(it.priceSnapshot) * Number(it.quantity))}`)
        .join(' | ');
      rows.push([
        o.id,
        new Date(o.createdAt).toLocaleString(),
        o.user?.name || o.user?.username || '',
        o.user?.email || '',
        o.user?.phone || '',
        o.deliveryAddress || '',
        o.status,
        String(Number(o.totalAmount).toFixed(2)),
        o.notes || '',
        itemsStr,
      ]);
    });
    const csv = rows
      .map((r) => r.map((v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const dateStr = report?.date || format(reportDate, 'yyyy-MM-dd');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!report?.orders) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = report?.date || format(reportDate, 'yyyy-MM-dd');
    doc.text(`Orders Report - ${dateStr}`, 14, 10);
    const head = [['Order ID', 'Created At', 'User', 'Email', 'Phone', 'Address', 'Status', 'Total', 'Notes', 'Items']];
    const body = report.orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString(),
      o.user?.name || o.user?.username || '',
      o.user?.email || '',
      o.user?.phone || '',
      o.deliveryAddress || '',
      o.status,
      toCurrency(o.totalAmount),
      o.notes || '',
      (o.items || [])
        .map((it) => `${it.nameSnapshot} x${it.quantity} = ${toCurrency(Number(it.priceSnapshot) * Number(it.quantity))}`)
        .join(' | '),
    ]);
    autoTable(doc, { head, body, styles: { fontSize: 7 }, headStyles: { fillColor: [240, 240, 240] }, startY: 14 });
    doc.save(`orders_${dateStr}.pdf`);
  };

  const handleCreateCategory = async () => {
    const errors = validateCategory(newCat);
    if (Object.keys(errors).length > 0) {
      setCatErrors(errors);
      return;
    }
    
    if (!token) {
      toast({ title: 'Admin token required', variant: 'destructive' });
      return;
    }
    
    const opId = 'create-cat';
    addOperation(opId);
    
    try {
      const payload = { name: newCat.name, description: newCat.description || undefined };
      const res = await fetch(`${apiBase}/api/admin/menu/categories`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok || res.status === 201) {
        toast({ 
          title: '✓ Category created',
          description: `"${newCat.name}" added successfully`
        });
        setNewCat({ name: '', description: '' });
        setCatErrors({});
        void fetchMenu();
        setShowCreateCategory(false);
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ 
          title: 'Failed to create category', 
          description: e.error || 'Unknown error',
          variant: 'destructive' 
        });
      }
    } finally {
      removeOperation(opId);
    }
  };

  const handleUpdateCategory = async () => {
    const errors = validateCategory(editCat);
    if (Object.keys(errors).length > 0) return;
    
    if (!token || !editCat.id) return;
    
    const opId = `update-cat-${editCat.id}`;
    addOperation(opId);
    
    try {
      const payload = { name: editCat.name, description: editCat.description };
      const res = await fetch(`${apiBase}/api/admin/menu/categories/${editCat.id}`, { 
        method: 'PATCH', 
        headers, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok) {
        toast({ 
          title: '✓ Category updated',
          description: `Changes saved successfully`
        });
        setEditCat({ id: '', name: '', description: '' });
        setShowEditCategory(false);
        void fetchMenu();
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ 
          title: 'Update failed', 
          description: e.error || 'Error',
          variant: 'destructive' 
        });
      }
    } finally {
      removeOperation(opId);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    confirm(
      'Delete Category?',
      `Are you sure you want to delete "${name}"? All items in this category will also be deleted. This action cannot be undone.`,
      async () => {
        const opId = `delete-cat-${id}`;
        addOperation(opId);
        
        try {
          const res = await fetch(`${apiBase}/api/admin/menu/categories/${id}`, { 
            method: 'DELETE', 
            headers 
          });
          
          if (res.ok) {
            toast({ 
              title: '✓ Category deleted',
              description: `"${name}" removed successfully`
            });
            void fetchMenu();
          } else {
            const e = await res.json().catch(() => ({}));
            toast({ 
              title: 'Delete failed', 
              description: e.error || 'Error',
              variant: 'destructive' 
            });
          }
        } finally {
          removeOperation(opId);
        }
      }
    );
  };

  const handleCreateItem = async () => {
    const errors = validateItem(newItem);
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors);
      return;
    }
    
    if (!token) {
      toast({ title: 'Admin token required', variant: 'destructive' });
      return;
    }
    
    const opId = 'create-item';
    addOperation(opId);
    
    try {
      const payload = { 
        categoryId: newItem.categoryId, 
        name: newItem.name, 
        price: Number(newItem.price),
        available: newItem.available
      };
      const res = await fetch(`${apiBase}/api/admin/menu/items`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok || res.status === 201) {
        toast({ 
          title: '✓ Item created',
          description: `"${newItem.name}" added successfully`
        });
        setNewItem({ categoryId: '', name: '', price: '', available: true });
        setItemErrors({});
        void fetchMenu();
        setShowCreateItem(false);
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ 
          title: 'Failed to create item', 
          description: e.error || 'Error',
          variant: 'destructive' 
        });
      }
    } finally {
      removeOperation(opId);
    }
  };

  const handleUpdateItem = async () => {
    const errors = validateItem({ ...editItem, categoryId: 'temp' });
    if (errors.name || errors.price) return;
    
    if (!token || !editItem.id) return;
    
    const opId = `update-item-${editItem.id}`;
    addOperation(opId);
    
    try {
      const payload = { 
        name: editItem.name, 
        price: Number(editItem.price),
        available: editItem.available
      };
      const res = await fetch(`${apiBase}/api/admin/menu/items/${editItem.id}`, { 
        method: 'PATCH', 
        headers, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok) {
        toast({ 
          title: '✓ Item updated',
          description: 'Changes saved successfully'
        });
        setEditItem({ id: '', name: '', price: '', available: true });
        setShowEditItem(false);
        void fetchMenu();
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ 
          title: 'Update failed', 
          description: e.error || 'Error',
          variant: 'destructive' 
        });
      }
    } finally {
      removeOperation(opId);
    }
  };

  const handleDeleteItem = async (id, name) => {
    confirm(
      'Delete Item?',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      async () => {
        const opId = `delete-item-${id}`;
        addOperation(opId);
        
        try {
          const res = await fetch(`${apiBase}/api/admin/menu/items/${id}`, { 
            method: 'DELETE', 
            headers 
          });
          
          if (res.ok) {
            toast({ 
              title: '✓ Item deleted',
              description: `"${name}" removed successfully`
            });
            void fetchMenu();
          } else {
            const e = await res.json().catch(() => ({}));
            toast({ 
              title: 'Delete failed', 
              description: e.error || 'Error',
              variant: 'destructive' 
            });
          }
        } finally {
          removeOperation(opId);
        }
      }
    );
  };

  const handleStartEditCategory = (cat) => {
    setEditCat({ id: cat.id, name: cat.name, description: cat.description || '' });
    setShowEditCategory(true);
  };

  const handleStartEditItem = (item) => {
    setEditItem({ id: item.id, name: item.name, price: item.price, available: item.available ?? true });
    setShowEditItem(true);
  };

  // Filter menu based on search
  const filteredMenu = useMemo(() => {
    if (!menu || !searchQuery) return menu;
    
    const query = searchQuery.toLowerCase();
    return {
      ...menu,
      categories: menu.categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => 
          item.name.toLowerCase().includes(query) ||
          cat.name.toLowerCase().includes(query)
        )
      })).filter(cat => 
        cat.name.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query) ||
        cat.items.length > 0
      )
    };
  }, [menu, searchQuery]);

  const totalItems = menu?.categories.reduce((sum, cat) => sum + cat.items.length, 0) || 0;

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gray-50 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Admin Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admintoken">Admin Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      id="admintoken" 
                      type={showToken ? "text" : "password"}
                      value={token} 
                      onChange={(e) => save(e.target.value)} 
                      placeholder="Enter X-Admin-Token"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button onClick={() => save('')} variant="outline" size="icon">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button onClick={handleValidateToken} disabled={!token}>
                    {isValidated ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                        Validated
                      </>
                    ) : (
                      'Validate'
                    )}
                  </Button>
                  {!token && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Token required for admin operations
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchMenu} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Refresh Menu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isValidated ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-gray-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Enter and validate the admin token to access admin features.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="menu" className="space-y-4">
            <TabsList>
              <TabsTrigger value="menu">Menu Management</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Menu Tab */}
            <TabsContent value="menu" className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-gray-900">{menu?.categories?.length || 0}</div>
                    <div className="text-sm text-gray-600">Categories</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-gray-900">{activeOperations.size}</div>
                    <div className="text-sm text-gray-600">Active Operations</div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search categories and items..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreateCategory(true)} className="whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2" /> New Category
                  </Button>
                  <Button onClick={() => setShowCreateItem(true)} variant="secondary" className="whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2" /> New Item
                  </Button>
                </div>
              </div>

              {/* Menu Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Menu {searchQuery && `(filtered)`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : (filteredMenu?.categories || []).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      {searchQuery ? 'No results found' : 'No categories yet'}
                    </div>
                  ) : (
                    (filteredMenu?.categories || []).map((c) => (
                      <div key={c.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">{c.name}</h3>
                            {c.description && (
                              <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">{c.items.length} items</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={() => handleStartEditCategory(c)}
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleDeleteCategory(c.id, c.name)}
                              disabled={activeOperations.has(`delete-cat-${c.id}`)}
                            >
                              {activeOperations.has(`delete-cat-${c.id}`) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 mr-1" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </div>
                        
                        {c.items.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {c.items.map((it) => (
                              <div 
                                key={it.id} 
                                className="border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{it.name}</p>
                                  <p className="text-sm font-semibold text-emerald-600">
                                    ${Number(it.price).toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleStartEditItem(it)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleDeleteItem(it.id, it.name)}
                                    disabled={activeOperations.has(`delete-item-${it.id}`)}
                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                  >
                                    {activeOperations.has(`delete-item-${it.id}`) ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded">
                            No items in this category
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Orders Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1">
                      <Label>Select date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {reportDate ? format(reportDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={reportDate}
                            onSelect={(d) => d && setReportDate(d)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={fetchReport} disabled={reportLoading}>
                        {reportLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit
                      </Button>
                      <Button onClick={exportCSV} variant="secondary" disabled={!report || reportLoading}>
                        <Download className="w-4 h-4 mr-2" />
                        Excel (CSV)
                      </Button>
                      <Button onClick={exportPDF} variant="secondary" disabled={!report || reportLoading}>
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  {!report ? (
                    <p className="text-gray-600 text-sm">Pick a date and submit to view orders.</p>
                  ) : report.count === 0 ? (
                    <p className="text-gray-600 text-sm">No orders found for {report.date}.</p>
                  ) : (
                    <div className="border rounded-lg bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(report.orders || []).map((o) => (
                            <TableRow key={o.id}>
                              <TableCell className="font-mono text-xs">{o.id}</TableCell>
                              <TableCell>{new Date(o.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="text-gray-900">{o.user?.name || o.user?.username || '-'}</div>
                                <div className="text-xs text-gray-500">{o.user?.username}</div>
                              </TableCell>
                              <TableCell className="text-xs">{o.user?.email || '-'}</TableCell>
                              <TableCell className="text-xs">{o.user?.phone || '-'}</TableCell>
                              <TableCell className="text-xs max-w-[240px] truncate">{o.deliveryAddress || '-'}</TableCell>
                              <TableCell className="text-xs">{o.status}</TableCell>
                              <TableCell className="text-xs">
                                <ul className="list-disc pl-4">
                                  {(o.items || []).map((it) => (
                                    <li key={it.id}>
                                      {it.nameSnapshot} x{it.quantity} — {toCurrency(Number(it.priceSnapshot) * Number(it.quantity))}
                                    </li>
                                  ))}
                                </ul>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{toCurrency(o.totalAmount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ordering Window</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Start time</Label>
                      <Input type="time" value={owStart} onChange={(e) => setOwStart(e.target.value)} />
                    </div>
                    <div>
                      <Label>End time</Label>
                      <Input type="time" value={owEnd} onChange={(e) => setOwEnd(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={saveOrderWindow} disabled={owLoading} className="w-full">
                        {owLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                  {owTZ && (
                    <p className="text-sm text-gray-600">Times apply in time zone: <span className="font-medium">{owTZ}</span></p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create Category Dialog */}
      <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input 
                  value={newCat.name} 
                  onChange={(e) => {
                    setNewCat({ ...newCat, name: e.target.value });
                    setCatErrors({});
                  }}
                  placeholder="Category name"
                  className={catErrors.name ? 'border-red-500' : ''}
                />
                {catErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{catErrors.name}</p>
                )}
              </div>
              <div>
                <Label>Description</Label>
                <Input 
                  value={newCat.description} 
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCreateCategory}
              disabled={activeOperations.has('create-cat') || !token}
            >
              {activeOperations.has('create-cat') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategory && !!editCat.id} onOpenChange={(o) => { setShowEditCategory(o); if (!o) setEditCat({ id: '', name: '', description: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={editCat.name} 
                  onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input 
                  value={editCat.description} 
                  onChange={(e) => setEditCat({ ...editCat, description: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateCategory}
              disabled={!editCat.id || activeOperations.has(`update-cat-${editCat.id}`)}
            >
              {activeOperations.has(`update-cat-${editCat.id}`) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Item Dialog */}
      <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Category *</Label>
                <select 
                  className={`border rounded h-10 px-3 w-full ${itemErrors.categoryId ? 'border-red-500' : 'border-gray-300'}`}
                  value={newItem.categoryId} 
                  onChange={(e) => {
                    setNewItem({ ...newItem, categoryId: e.target.value });
                    setItemErrors({});
                  }}
                >
                  <option value="">Select category</option>
                  {(menu?.categories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {itemErrors.categoryId && (
                  <p className="text-sm text-red-600 mt-1">{itemErrors.categoryId}</p>
                )}
              </div>
              <div>
                <Label>Name *</Label>
                <Input 
                  value={newItem.name} 
                  onChange={(e) => {
                    setNewItem({ ...newItem, name: e.target.value });
                    setItemErrors({});
                  }}
                  placeholder="Item name"
                  className={itemErrors.name ? 'border-red-500' : ''}
                />
                {itemErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{itemErrors.name}</p>
                )}
              </div>
              <div>
                <Label>Price *</Label>
                <Input 
                  value={newItem.price} 
                  onChange={(e) => {
                    setNewItem({ ...newItem, price: e.target.value });
                    setItemErrors({});
                  }}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                  className={itemErrors.price ? 'border-red-500' : ''}
                />
                {itemErrors.price && (
                  <p className="text-sm text-red-600 mt-1">{itemErrors.price}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCreateItem}
              disabled={activeOperations.has('create-item') || !token}
            >
              {activeOperations.has('create-item') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItem && !!editItem.id} onOpenChange={(o) => { setShowEditItem(o); if (!o) setEditItem({ id: '', name: '', price: '', available: true }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={editItem.name} 
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input 
                  value={editItem.price} 
                  onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateItem}
              disabled={!editItem.id || activeOperations.has(`update-item-${editItem.id}`)}
            >
              {activeOperations.has(`update-item-${editItem.id}`) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {config.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {config.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
