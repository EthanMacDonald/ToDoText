import React from 'react';

type FiltersProps = {
  filters: { area: string; context: string; project: string };
  setFilters: (f: { area: string; context: string; project: string }) => void;
};

const areas = ['', 'Work', 'Personal', 'Health', 'Finances'];
const contexts = ['', '@home', '@work', '@computer'];
const projects = ['', '+project1', '+project2'];

const Filters: React.FC<FiltersProps> = ({ filters, setFilters }) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
    <select value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value })}>
      {areas.map(a => <option key={a} value={a}>{a || 'All Areas'}</option>)}
    </select>
    <select value={filters.context} onChange={e => setFilters({ ...filters, context: e.target.value })}>
      {contexts.map(c => <option key={c} value={c}>{c || 'All Contexts'}</option>)}
    </select>
    <select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })}>
      {projects.map(p => <option key={p} value={p}>{p || 'All Projects'}</option>)}
    </select>
  </div>
);

export default Filters;
