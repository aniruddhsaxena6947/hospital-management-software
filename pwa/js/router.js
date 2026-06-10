/* ============================================================
   CareStation — SPA Router
   ============================================================ */

(() => {
  'use strict';

  const pages = new Map();
  const PAGE_TEMPLATES = {
    dashboard:    { title: 'Dashboard',           tag: 'Overview' },
    patients:     { title: 'Patient Management',  tag: 'Patients' },
    appointments: { title: 'Appointments',        tag: 'Schedule' },
    doctors:      { title: 'Doctors',             tag: 'Staff' },
    emr:          { title: 'EMR / Records',       tag: 'Clinical' },
    pharmacy:     { title: 'Pharmacy',            tag: 'Inventory' },
    lab:          { title: 'Laboratory',          tag: 'Diagnostics' },
    wards:        { title: 'Wards & Beds',        tag: 'Capacity' },
    billing:      { title: 'Billing',             tag: 'Finance' },
    reports:      { title: 'Reports & Analytics', tag: 'Insights' },
    staff:        { title: 'Staff',               tag: 'HR' },
    settings:     { title: 'Settings',            tag: 'Account' }
  };

  function getPageHTML(name) {
    const tpl = PAGE_TEMPLATES[name];
    if (!tpl) return `<section class="page active"><div class="empty">Unknown page: ${name}</div></section>`;
    return `<section class="page active" id="pg-${name}" data-title="${tpl.title}" data-tag="${tpl.tag}">${renderPage(name)}</section>`;
  }

  function renderPage(name) {
    const renderer = pages.get(name);
    if (renderer) return renderer();
    return pages._404 ? pages._404() : `<div class="empty">Page not found</div>`;
  }

  function registerPage(name, fn) { pages.set(name, fn); }
  function setNotFound(fn) { pages._404 = fn; }

  async function go(name) {
    if (!PAGE_TEMPLATES[name]) name = 'dashboard';
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = getPageHTML(name);
    document.getElementById('ptitle').textContent = PAGE_TEMPLATES[name].title;
    document.getElementById('ptag').textContent   = PAGE_TEMPLATES[name].tag;

    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === name);
    });
    document.querySelectorAll('.bnav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === name);
    });

    location.hash = name;

    const page = document.getElementById('pg-' + name);
    if (page && window.pages && typeof window.pages.afterRender === 'function') {
      try { await window.pages.afterRender(name); } catch (e) { console.error(e.message); }
    }

    document.querySelector('.sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-page]');
      if (!nav) return;
      e.preventDefault();
      go(nav.dataset.page);
    });

    window.addEventListener('hashchange', () => {
      const h = (location.hash || '#dashboard').slice(1);
      go(h);
    });
  }

  window.router = { init, go, registerPage, setNotFound };
})();
