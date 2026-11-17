import {openDB} from './db.js';
openDB().catch(console.error);
const stations = ['library','record','settings'];
const current = new URLSearchParams(location.search).get('view');
const view = stations.includes(current) ? current : 'library';
document.querySelectorAll('[data-view]').forEach(panel => panel.hidden = panel.dataset.view !== view);
document.querySelector('#frequency').textContent = {library:'88.1',record:'96.4',settings:'104.2'}[view];
