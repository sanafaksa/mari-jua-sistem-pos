/**
 * Mari Jua Jastip - Shared Realtime Sync Engine (sync.js)
 * Menghubungkan halaman form pemesanan pelanggan (index.html)
 * dengan dashboard admin (admin.html) secara otomatis dan real-time.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MJJ_SYNC = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_ORDERS = 'mjj.orders';
  const STORAGE_SETTINGS = 'mjj.settings';
  const STORAGE_DRAFT = 'mjj.cust.draft';
  const CHANNEL_NAME = 'mjj_realtime_channel';

  // BroadcastChannel untuk sinkronisasi instan antar tab/window di browser yang sama
  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('[MJJ Sync] BroadcastChannel tidak didukung browser ini:', e);
  }

  // Supabase Client (jika dikonfigurasi di config.js)
  let supabaseClient = null;
  let supabaseSubscribed = false;

  const DEF_SETTINGS = {
    biz: 'Mari Jua Jastip',
    wa: '6282148505323',
    pay: 'Transfer SeaBank 901505338280 a.n. Amanda',
    foot: 'Terima kasih sudah jastip di Mari Jua Jastip!',
    prefix: 'MJJ',
    defFee: 10,
    defParkir: 2000,
    seeded: false
  };

  function getGlobalConfig() {
    const cfg = (typeof window !== 'undefined' && window.MJJ_CONFIG) ? window.MJJ_CONFIG : {};
    return Object.assign({}, DEF_SETTINGS, cfg);
  }

  function getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_SETTINGS));
      if (s && typeof s === 'object') {
        const res = Object.assign({}, getGlobalConfig(), s);
        if (!res.pay || res.pay.includes('1234567890')) {
          res.pay = getGlobalConfig().pay || 'Transfer SeaBank 901505338280 a.n. Amanda';
          try { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(res)); } catch (e) {}
        }
        return res;
      }
    } catch (e) {}
    return getGlobalConfig();
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
      notifyChannel({ type: 'SETTINGS_UPDATED', settings });
    } catch (e) {
      console.warn('[MJJ Sync] Gagal menyimpan settings:', e);
    }
  }

  function getOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_ORDERS);
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch (e) {}
    return [];
  }

  function saveOrders(orders) {
    try {
      localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn('[MJJ Sync] Gagal menyimpan orders:', e);
    }
  }

  function uid() {
    return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function ymd(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function nextInvoiceNo(dateStr) {
    const st = getSettings();
    const d = dateStr || ymd();
    const prefix = (st.prefix || 'MJJ').trim().replace(/\s+/g, '') + '-' + d.slice(2, 4) + d.slice(5, 7) + '-';
    const orders = getOrders();
    let max = 0;
    orders.forEach(o => {
      if (o && o.no && String(o.no).startsWith(prefix)) {
        const numPart = parseInt(String(o.no).slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > max) max = numPart;
      }
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function calculateTotals(order) {
    const sub = (order.items || []).reduce((acc, it) => acc + (+it.qty || 0) * (+it.price || 0), 0);
    const charges = (order.charges || []).map(c => {
      const isPct = String(c.kind || '').endsWith('pct');
      const base = isPct ? Math.round(sub * (+c.value || 0) / 100) : Math.round(+c.value || 0);
      const isNegative = String(c.kind || '')[0] === 'n';
      return {
        label: c.label || 'Biaya',
        kind: c.kind,
        value: c.value,
        pct: isPct,
        amt: isNegative ? -base : base
      };
    });
    const total = sub + charges.reduce((acc, c) => acc + c.amt, 0);
    const paid = +order.paid || 0;
    const sisa = total - paid;
    const payStatus = paid <= 0 ? 'belum' : (sisa <= 0 ? 'lunas' : 'dp');
    return { sub, charges, total, paid, sisa, payStatus };
  }

  function notifyChannel(msg) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(msg);
      } catch (e) {
        console.warn('[MJJ Sync] Gagal kirim ke BroadcastChannel:', e);
      }
    }
  }

  // Inisialisasi Supabase jika tersedia
  function initSupabase() {
    if (supabaseClient) return supabaseClient;
    const cfg = getGlobalConfig();
    if (typeof window !== 'undefined' && window.supabase && cfg.supabaseUrl && cfg.supabaseKey) {
      try {
        supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
        return supabaseClient;
      } catch (e) {
        console.warn('[MJJ Sync] Gagal init Supabase:', e);
      }
    }
    return null;
  }

  // Membuat pesanan baru dari data form pemesanan pelanggan
  function createOrderFromForm(formData) {
    const date = ymd();
    const st = getSettings();
    const invoiceNo = nextInvoiceNo(date);
    const defFee = typeof st.defFee === 'number' ? st.defFee : (parseFloat(st.defFee) || 10);
    const isDelivery = formData.serviceType === 'antar_paket';
    const shipTime = String(formData.shipTime || '').trim();

    let items = [];
    let charges = [];
    let address = '';
    let notes = String(formData.notes || '').trim();

    if (isDelivery) {
      address = 'Antar ke: ' + String(formData.pkgDropoff || '').trim();
      const delegateInfo = [];
      if (formData.pkgDelegateName && String(formData.pkgDelegateName).trim()) {
        delegateInfo.push('Titip: ' + String(formData.pkgDelegateName).trim());
      }
      if (formData.pkgDelegateWa && String(formData.pkgDelegateWa).trim()) {
        delegateInfo.push('WA Titip: ' + String(formData.pkgDelegateWa).trim());
      }
      if (delegateInfo.length) {
        address += ' (' + delegateInfo.join(', ') + ')';
      }

      items = [{
        name: 'Pengantaran: ' + String(formData.pkgItem || 'Paket').trim(),
        note: 'Ambil: ' + String(formData.pkgPickup || '').trim() + ' ➔ Antar: ' + String(formData.pkgDropoff || '').trim() + (delegateInfo.length ? ' | ' + delegateInfo.join(', ') : '') + (shipTime ? ' | Waktu: ' + shipTime : ''),
        qty: 1,
        price: 0
      }];

      charges.push({ label: 'Ongkir', kind: 'rp', value: 0 });
      notes = ('[Pengantaran Paket]' + (shipTime ? ' [Waktu kirim: ' + shipTime + ']' : '') + (notes ? ' ' + notes : '')).trim();
    } else {
      address = formData.ship === 'ambil' ? 'Ambil sendiri' : String(formData.addr || '').trim();
      items = (formData.items || [])
        .filter(i => String(i.name || '').trim())
        .map(i => {
          const itemNotes = [];
          if (i.note && String(i.note).trim()) itemNotes.push(String(i.note).trim());
          if (i.link && String(i.link).trim()) itemNotes.push('Link/Toko: ' + String(i.link).trim());
          return {
            name: String(i.name).trim(),
            note: itemNotes.join(' | '),
            qty: Math.max(1, parseInt(i.qty, 10) || 1),
            price: Math.max(0, parseInt(i.price, 10) || 0)
          };
        });

      if (defFee > 0) {
        charges.push({ label: 'Fee jasa', kind: 'pct', value: defFee });
      }
      charges.push({ label: 'Ongkir', kind: 'rp', value: 0 });
      if (shipTime) {
        notes = ('[Waktu ' + (formData.ship === 'ambil' ? 'ambil: ' : 'kirim: ') + shipTime + ']' + (notes ? ' ' + notes : '')).trim();
      }
    }

    const order = {
      id: uid(),
      no: invoiceNo,
      date: date,
      serviceType: isDelivery ? 'antar_paket' : 'jastip',
      shipTime: shipTime,
      customer: {
        name: String(formData.name || '').trim(),
        wa: String(formData.wa || '').trim(),
        address: address,
        shipTime: shipTime
      },
      items: items,
      charges: charges,
      paid: 0,
      status: 'baru', // "Baru masuk"
      notes: notes,
      source: 'web_form',
      createdAt: Date.now()
    };

    return order;
  }

  // Kirim pesanan dari form pemesanan (pelanggan) ke admin
  async function submitCustomerOrder(formData) {
    const order = createOrderFromForm(formData);

    // 1. Simpan ke local storage
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);

    // 2. Broadcast via BroadcastChannel ke semua tab admin yang sedang terbuka
    notifyChannel({
      type: 'NEW_ORDER',
      order: order,
      timestamp: Date.now()
    });

    // 3. Dispatch CustomEvent pada window (untuk tab yang sama)
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mjj:new_order', { detail: order }));
    }

    // 4. Jika Supabase aktif, kirim ke database cloud agar admin di perangkat lain langsung update
    const sb = initSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('mjj_orders').insert([{
          id: order.id,
          no: order.no,
          customer_name: order.customer.name,
          customer_wa: order.customer.wa,
          status: order.status,
          data: order,
          created_at: new Date(order.createdAt).toISOString()
        }]);
        if (error) console.warn('[MJJ Sync] Supabase insert error:', error);
      } catch (e) {
        console.warn('[MJJ Sync] Supabase sync gagal:', e);
      }
    }

    return order;
  }

  // Web Audio chime notifikasi untuk pesanan baru
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Nada 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.32);

      // Nada 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      // Browser mungkin memblokir audio sebelum interaksi pengguna
    }
  }

  // Notifikasi Browser Desktop (jika diizinkan)
  function showDesktopNotification(order) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const tot = calculateTotals(order);
        new Notification('Pesanan Baru Masuk! - ' + (order.customer.name || 'Pelanggan'), {
          body: 'Invoice: ' + order.no + ' | ' + (order.items.length) + ' barang (Rp ' + Math.abs(Math.round(tot.total)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ')',
          icon: 'favicon.png'
        });
      } catch (e) {}
    }
  }

  // Listener untuk Dashboard Admin
  function listenForOrders(handlers) {
    const onNew = handlers.onNew || function () {};
    const onUpdate = handlers.onUpdate || function () {};
    const onDeleted = handlers.onDeleted || function () {};

    // A. BroadcastChannel (antar tab di browser yang sama)
    if (broadcastChannel) {
      broadcastChannel.onmessage = function (e) {
        const msg = e.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'NEW_ORDER' && msg.order) {
          onNew(msg.order);
        } else if (msg.type === 'UPDATE_ORDER' && msg.order) {
          onUpdate(msg.order);
        } else if (msg.type === 'DELETE_ORDER' && msg.id) {
          onDeleted(msg.id);
        }
      };
    }

    // B. Storage event (fallback jika BroadcastChannel tidak memicu)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_ORDERS && e.newValue) {
          try {
            const list = JSON.parse(e.newValue);
            if (Array.isArray(list)) {
              onUpdate(list);
            }
          } catch (err) {}
        }
      });

      // C. CustomEvent di tab yang sama
      window.addEventListener('mjj:new_order', function (e) {
        if (e.detail) onNew(e.detail);
      });
    }

    // D. Supabase Realtime subscription (untuk sinkronisasi antar HP & Komputer)
    const sb = initSupabase();
    if (sb && !supabaseSubscribed) {
      try {
        supabaseSubscribed = true;
        sb.channel('mjj_realtime_orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'mjj_orders' }, function (payload) {
            if (payload.eventType === 'INSERT' && payload.new && payload.new.data) {
              onNew(payload.new.data);
            } else if (payload.eventType === 'UPDATE' && payload.new && payload.new.data) {
              onUpdate(payload.new.data);
            } else if (payload.eventType === 'DELETE' && payload.old && payload.old.id) {
              onDeleted(payload.old.id);
            }
          })
          .subscribe();
      } catch (e) {
        console.warn('[MJJ Sync] Gagal subscribe Supabase Realtime:', e);
      }
    }
  }

  return {
    STORAGE_ORDERS,
    STORAGE_SETTINGS,
    STORAGE_DRAFT,
    getSettings,
    saveSettings,
    getOrders,
    saveOrders,
    uid,
    ymd,
    nextInvoiceNo,
    calculateTotals,
    createOrderFromForm,
    submitCustomerOrder,
    notifyChannel,
    listenForOrders,
    playNotificationChime,
    showDesktopNotification,
    initSupabase
  };
});
