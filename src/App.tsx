import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoreStatus {
  connected: boolean; apiKey: string; url: string;
  sales: number; productsCount: number;
}
interface Stores {
  shopify: StoreStatus; amazon: StoreStatus;
  ebay: StoreStatus; tiktok: StoreStatus;
}
interface Product {
  id: string; title: string; price: number; image: string;
  tags: string[]; description: string; keywords: string; seoText: string;
  stores: { shopify: string; amazon: string; ebay: string; tiktok: string; };
  createdAt: string;
}
interface Trend {
  id: string; title: string; category: string; demandScore: number;
  avgSellingPrice: number; source: string; tags: string[];
  bossQuote: string; imageSearchTerm: string;
}
interface Sale { product: { title: string; price: number; image: string }; buyer: string; store: string; amount: number; }

type Tab = 'command' | 'products' | 'trends' | 'connections' | 'add';

const STORE_COLORS: Record<string, string> = {
  shopify: '#96bf48', amazon: '#ff9900', ebay: '#e53238', tiktok: '#ff0050',
};
const STORE_ICONS: Record<string, string> = {
  shopify: '🛍️', amazon: '📦', ebay: '🔨', tiktok: '🎵',
};

// ─── 3D Command Centre ────────────────────────────────────────────────────────
function CommandCentre({ stats }: { stats: any }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; animId: number } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 2, 7);
    camera.lookAt(0, 0, 0);

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0x334155, 2));
    const dir = new THREE.DirectionalLight(0x6366f1, 3);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x8b5cf6, 2);
    dir2.position.set(-5, 3, -5);
    scene.add(dir2);

    // Grid floor
    const grid = new THREE.GridHelper(20, 20, 0x1e293b, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // Central orb
    const orbGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const orbMat = new THREE.MeshPhongMaterial({
      color: 0x6366f1, emissive: 0x4338ca, shininess: 100,
      transparent: true, opacity: 0.9,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(orb);

    // Orbit ring
    const ringGeo = new THREE.TorusGeometry(1.4, 0.04, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    scene.add(ring);

    // Store pillars
    const stores = ['shopify', 'amazon', 'ebay', 'tiktok'];
    const pillarColors = [0x96bf48, 0xff9900, 0xe53238, 0xff0050];
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const pillars: THREE.Mesh[] = [];
    const salesValues = stats?.charts?.revenueByStore?.map((s: any) => s.value) || [12000, 34000, 0, 8000];
    const maxSale = Math.max(...salesValues, 1);

    stores.forEach((_, i) => {
      const h = 0.3 + (salesValues[i] / maxSale) * 2.5;
      const geo = new THREE.BoxGeometry(0.5, h, 0.5);
      const mat = new THREE.MeshPhongMaterial({ color: pillarColors[i], emissive: pillarColors[i], emissiveIntensity: 0.3 });
      const pillar = new THREE.Mesh(geo, mat);
      pillar.position.set(Math.cos(angles[i]) * 3.5, h / 2, Math.sin(angles[i]) * 3.5);
      scene.add(pillar);
      pillars.push(pillar);

      // Floating label sphere on top
      const dotGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: pillarColors[i] }));
      dot.position.set(Math.cos(angles[i]) * 3.5, h + 0.3, Math.sin(angles[i]) * 3.5);
      scene.add(dot);
    });

    // Particles
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) positions[i] = (Math.random() - 0.5) * 14;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x6366f1, size: 0.06, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(pGeo, pMat));

    let t = 0;
    const animate = () => {
      const animId = requestAnimationFrame(animate);
      sceneRef.current = { renderer, animId };
      t += 0.01;
      orb.rotation.y = t;
      ring.rotation.z = t * 0.4;
      orb.position.y = Math.sin(t) * 0.15;
      pillars.forEach((p, i) => {
        p.material && ((p.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.2 + Math.sin(t + i) * 0.15);
      });
      camera.position.x = Math.sin(t * 0.1) * 1.5;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [stats]);

  return <div ref={mountRef} style={{ width: '100%', height: 320, borderRadius: 12, overflow: 'hidden' }} />;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{
        width: 32, height: 32, border: '3px solid #1e293b',
        borderTopColor: '#6366f1', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const bg = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1';
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: 'white', padding: '12px 20px', borderRadius: 10,
      fontWeight: 600, fontSize: '0.875rem', zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease',
      maxWidth: '90vw', textAlign: 'center',
    }}>
      {msg}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>('command');
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Stores | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [saleAlert, setSaleAlert] = useState<Sale | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Add product form
  const [form, setForm] = useState({ title: '', price: '', tags: '', image: '' });
  const [generating, setGenerating] = useState(false);
  const [generatedSEO, setGeneratedSEO] = useState<any>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Data fetching ──
  const fetchAll = useCallback(async () => {
    try {
      const [p, s, st] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/stores').then(r => r.json()),
        fetch('/api/stores/stats').then(r => r.json()),
      ]);
      setProducts(p);
      setStores(s);
      setStats(st);
    } catch { /* offline — use cached */ }
  }, []);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/trends').then(r => r.json());
      setTrends(data);
    } catch { showToast('Could not load trends', 'error'); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Simulate sale every 18s ──
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const data = await fetch('/api/stores/simulate-sale', { method: 'POST' }).then(r => r.json());
        if (data.success) {
          setSaleAlert(data);
          fetchAll();
          setTimeout(() => setSaleAlert(null), 4000);
        }
      } catch { /* silent */ }
    }, 18000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ── Generate SEO ──
  const handleGenerateSEO = async () => {
    if (!form.title) { showToast('Enter a product title first', 'error'); return; }
    setGenerating(true);
    try {
      const data = await fetch('/api/products/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, price: form.price, tags: form.tags.split(',').map(t => t.trim()) }),
      }).then(r => r.json());
      setGeneratedSEO(data);
      showToast('✨ Gemini SEO generated!', 'success');
    } catch { showToast('SEO generation failed', 'error'); }
    setGenerating(false);
  };

  // ── Add product ──
  const handleAddProduct = async () => {
    if (!form.title || !form.price) { showToast('Title and price are required', 'error'); return; }
    setLoading(true);
    try {
      const body = {
        title: form.title,
        price: parseFloat(form.price),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        image: form.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=60',
        ...(generatedSEO || {}),
        publishToAll: true,
      };
      const product = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }).then(r => r.json());
      setProducts(prev => [product, ...prev]);
      setForm({ title: '', price: '', tags: '', image: '' });
      setGeneratedSEO(null);
      showToast('✅ Product added to all stores!', 'success');
      setTab('products');
      fetchAll();
    } catch { showToast('Failed to add product', 'error'); }
    setLoading(false);
  };

  // ── Delete product ──
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedProduct(null);
      showToast('Product deleted', 'info');
    } catch { showToast('Delete failed', 'error'); }
  };

  // ── Sync product ──
  const handleSync = async (productId: string, store: string) => {
    try {
      const data = await fetch(`/api/sync/${productId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store }),
      }).then(r => r.json());
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(`✅ Synced to ${store}!`, 'success');
      fetchAll();
    } catch { showToast('Sync failed', 'error'); }
  };

  // ── Toggle store connection ──
  const handleToggleStore = async (store: string, current: boolean) => {
    try {
      await fetch('/api/stores/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, connected: !current }),
      });
      fetchAll();
      showToast(`${store} ${!current ? 'connected' : 'disconnected'}`, !current ? 'success' : 'info');
    } catch { showToast('Connection failed', 'error'); }
  };

  const totalSales = stats?.summary?.totalSales ?? 0;
  const connectedCount = stores ? Object.values(stores).filter(s => s.connected).length : 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f172a' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 220 : 0,
        minWidth: sidebarOpen ? 220 : 0,
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        transition: 'all 0.3s',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
      }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛒</div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>OMNICHANNEL</div>
              <div style={{ fontSize: '0.65rem', color: '#475569' }}>Command Centre</div>
            </div>
          </div>
          {([
            ['command', '🌐', '3D Dashboard'],
            ['products', '📦', 'Products'],
            ['add', '➕', 'Add Product'],
            ['trends', '📈', 'Trends'],
            ['connections', '🔗', 'Connections'],
          ] as [Tab, string, string][]).map(([id, icon, label]) => (
            <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => { setTab(id); setSidebarOpen(false); }}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.7rem', color: '#475569' }}>
            <div style={{ color: '#10b981', fontWeight: 700 }}>${totalSales.toLocaleString('en', { maximumFractionDigits: 0 })}</div>
            <div>Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderBottom: '1px solid #1e293b',
          background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, padding: 4 }}>
            ☰
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0' }}>
              {tab === 'command' && '🌐 3D Command Centre'}
              {tab === 'products' && '📦 Products'}
              {tab === 'add' && '➕ Add Product'}
              {tab === 'trends' && '📈 Market Trends'}
              {tab === 'connections' && '🔗 Store Connections'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(STORE_ICONS).map(([s, icon]) => (
              <div key={s} title={s} style={{
                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, background: stores?.[s as keyof Stores]?.connected ? '#1e293b' : '#0f172a',
                border: `1px solid ${stores?.[s as keyof Stores]?.connected ? STORE_COLORS[s] : '#1e293b'}`,
                opacity: stores?.[s as keyof Stores]?.connected ? 1 : 0.4,
              }}>{icon}</div>
            ))}
          </div>
        </div>

        {/* Live sale alert */}
        {saleAlert && (
          <div style={{
            margin: '8px 12px 0', padding: '10px 14px', background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                New Sale! ${saleAlert.amount} via {STORE_ICONS[saleAlert.store]} {saleAlert.store}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {saleAlert.buyer} bought {saleAlert.product.title}
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 80px' }}>

          {/* ── COMMAND CENTRE ── */}
          {tab === 'command' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <CommandCentre stats={stats} />

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 12 }}>
                {[
                  { label: 'Total Revenue', value: `$${totalSales.toLocaleString('en', { maximumFractionDigits: 0 })}`, icon: '💰', color: '#10b981' },
                  { label: 'Products', value: stats?.summary?.totalProducts ?? 0, icon: '📦', color: '#6366f1' },
                  { label: 'Active Stores', value: `${connectedCount}/4`, icon: '🔗', color: '#f59e0b' },
                  { label: 'Products Listed', value: products.length, icon: '🛒', color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Weekly sales mini chart */}
              {stats?.charts?.weeklySales && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>📊 Weekly Sales</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                    {stats.charts.weeklySales.map((d: any) => {
                      const total = d.shopify + d.amazon + d.ebay + d.tiktok;
                      const max = 15000;
                      const h = Math.max(8, (total / max) * 80);
                      return (
                        <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: '100%', height: h, background: 'linear-gradient(to top,#6366f1,#8b5cf6)', borderRadius: 4 }} />
                          <div style={{ fontSize: '0.6rem', color: '#475569' }}>{d.day}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Revenue by store */}
              {stats?.charts?.revenueByStore && (
                <div className="card" style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>🏪 Revenue by Store</div>
                  {stats.charts.revenueByStore.map((s: any) => {
                    const max = Math.max(...stats.charts.revenueByStore.map((x: any) => x.value), 1);
                    const pct = (s.value / max) * 100;
                    const key = s.name.toLowerCase();
                    return (
                      <div key={s.name} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{STORE_ICONS[key]} {s.name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STORE_COLORS[key] || '#6366f1' }}>
                            ${s.value.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: STORE_COLORS[key] || '#6366f1', borderRadius: 3, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'products' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{products.length} products</span>
                <button className="btn-primary" onClick={() => setTab('add')}>➕ Add New</button>
              </div>

              {products.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  <div>No products yet. Add your first one!</div>
                </div>
              )}

              {products.map(p => (
                <div key={p.id} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <img src={p.image} alt={p.title}
                      style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#e2e8f0', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', marginBottom: 6 }}>
                        ${p.price.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {Object.entries(p.stores).map(([store, status]) => (
                          <span key={store} className={`badge-${status}`}>{STORE_ICONS[store]} {status}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ color: '#475569', fontSize: 18 }}>{selectedProduct?.id === p.id ? '▲' : '▼'}</div>
                  </div>

                  {/* Expanded product detail */}
                  {selectedProduct?.id === p.id && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #334155', animation: 'fadeIn 0.3s ease' }}>
                      {p.description && (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 }}>{p.description}</p>
                      )}
                      <div style={{ fontSize: '0.7rem', color: '#475569', marginBottom: 10 }}>
                        Tags: {p.tags.map(t => <span key={t} style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{t}</span>)}
                      </div>

                      {/* Sync buttons */}
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Sync to store:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {Object.entries(p.stores).map(([store, status]) => (
                          <button key={store}
                            style={{
                              background: status === 'published' ? 'rgba(16,185,129,0.15)' : '#1e293b',
                              border: `1px solid ${status === 'published' ? '#10b981' : '#334155'}`,
                              color: status === 'published' ? '#10b981' : '#94a3b8',
                              padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem',
                            }}
                            onClick={e => { e.stopPropagation(); handleSync(p.id, store); }}>
                            {STORE_ICONS[store]} {store}
                          </button>
                        ))}
                      </div>

                      <button className="btn-secondary"
                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                        onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>
                        🗑 Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── ADD PRODUCT ── */}
          {tab === 'add' && (
            <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: 500 }}>
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#818cf8', marginBottom: 16 }}>📝 Product Details</div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Product Title *</label>
                  <input placeholder="e.g. RGB Mechanical Keyboard" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Price (USD) *</label>
                  <input type="number" placeholder="29.99" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Tags (comma separated)</label>
                  <input placeholder="gaming, rgb, keyboard" value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Image URL (optional)</label>
                  <input placeholder="https://..." value={form.image}
                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
                </div>

                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                  onClick={handleGenerateSEO} disabled={generating}>
                  {generating ? '⏳ Generating...' : '✨ Generate Gemini SEO'}
                </button>

                {generatedSEO && (
                  <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: 12, animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', marginBottom: 8 }}>✨ AI-Generated Content</div>
                    {generatedSEO.bossQuote && (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic', marginBottom: 8, background: 'rgba(245,158,11,0.1)', padding: 8, borderRadius: 6 }}>
                        💼 {generatedSEO.bossQuote}
                      </div>
                    )}
                    {generatedSEO.description && (
                      <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6 }}>{generatedSEO.description.slice(0, 200)}...</p>
                    )}
                  </div>
                )}
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 0', fontSize: '1rem' }}
                onClick={handleAddProduct} disabled={loading}>
                {loading ? '⏳ Adding...' : '🚀 Add to All Stores'}
              </button>
            </div>
          )}

          {/* ── TRENDS ── */}
          {tab === 'trends' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>AI-powered market intelligence</span>
                <button className="btn-primary" onClick={fetchTrends} disabled={loading}>
                  {loading ? '⏳' : '🔄 Refresh'}
                </button>
              </div>

              {trends.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
                  <div style={{ color: '#64748b', marginBottom: 16 }}>Load AI trend analysis</div>
                  <button className="btn-primary" onClick={fetchTrends}>Scan Trends Now</button>
                </div>
              )}

              {loading && <Spinner />}

              {trends.map((t, i) => (
                <div key={t.id} className="card" style={{ marginBottom: 10, animation: `fadeIn ${0.2 + i * 0.1}s ease` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0', marginBottom: 4 }}>{t.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>📡 {t.source} · 🏷️ {t.category}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: t.demandScore > 90 ? '#10b981' : '#f59e0b' }}>
                        {t.demandScore}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#475569' }}>demand</div>
                    </div>
                  </div>

                  <div style={{ height: 4, background: '#1e293b', borderRadius: 2, marginBottom: 10 }}>
                    <div style={{ width: `${t.demandScore}%`, height: '100%', background: `linear-gradient(90deg, #6366f1, #10b981)`, borderRadius: 2, transition: 'width 1s ease' }} />
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontStyle: 'italic', marginBottom: 10, background: 'rgba(245,158,11,0.08)', padding: 8, borderRadius: 6 }}>
                    💼 {t.bossQuote}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>
                      ${t.avgSellingPrice.toFixed(2)}
                    </div>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      onClick={() => { setForm({ title: t.title, price: String(t.avgSellingPrice), tags: t.tags.join(', '), image: '' }); setTab('add'); }}>
                      ➕ Import
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {t.tags.map(tag => (
                      <span key={tag} style={{ background: '#1e293b', color: '#64748b', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem' }}>#{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONNECTIONS ── */}
          {tab === 'connections' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                Manage your store API connections
              </div>

              {stores && Object.entries(stores).map(([name, s]) => (
                <div key={name} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: s.connected ? 12 : 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      background: s.connected ? `${STORE_COLORS[name]}22` : '#1e293b',
                      border: `1px solid ${s.connected ? STORE_COLORS[name] : '#334155'}`,
                    }}>
                      {STORE_ICONS[name]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0', textTransform: 'capitalize' }}>{name}</div>
                      <div style={{ fontSize: '0.7rem', color: s.connected ? '#10b981' : '#ef4444' }}>
                        {s.connected ? '● Connected' : '○ Disconnected'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleStore(name, s.connected)}
                      style={{
                        background: s.connected ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        border: `1px solid ${s.connected ? '#ef4444' : '#10b981'}`,
                        color: s.connected ? '#ef4444' : '#10b981',
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      }}>
                      {s.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>

                  {s.connected && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>${s.sales.toLocaleString()}</div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>Sales</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>{s.productsCount}</div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>Products</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                          {s.url.split('.')[0]}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>Store URL</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ── Bottom nav ── */}
        <div style={{
          display: 'flex', borderTop: '1px solid #1e293b',
          background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(10px)',
          position: 'sticky', bottom: 0, zIndex: 50,
        }}>
          {([
            ['command', '🌐', 'Dashboard'],
            ['products', '📦', 'Products'],
            ['add', '➕', 'Add'],
            ['trends', '📈', 'Trends'],
            ['connections', '🔗', 'Stores'],
          ] as [Tab, string, string][]).map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '10px 4px', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === id ? '#818cf8' : '#475569',
                borderTop: tab === id ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: id === 'add' ? 22 : 18 }}>{icon}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: tab === id ? 700 : 400 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
