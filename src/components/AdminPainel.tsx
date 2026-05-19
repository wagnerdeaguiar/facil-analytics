'use client';

import { useCallback, useEffect, useState } from 'react';

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  subscriptionStatus: string;
  isBlocked: boolean;
  createdAt: string;
  _count: { jogos: number };
}

export function AdminPainel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');

  const carregar = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, [q, status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizar(userId: string, patch: Record<string, unknown>) {
    setMsg('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      setMsg('Usuário atualizado.');
      carregar();
    } else {
      const d = await res.json();
      setMsg(d.error ?? 'Erro ao atualizar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar nome ou e-mail"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input max-w-xs"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input max-w-[160px]">
          <option value="">Todos os planos</option>
          <option value="free">Free</option>
          <option value="active">Premium ativo</option>
          <option value="canceled">Cancelado</option>
          <option value="past_due">Em atraso</option>
        </select>
        <button type="button" onClick={carregar} className="btn-secondary">
          Filtrar
        </button>
      </div>

      {msg && <p className="text-sm text-brand-300">{msg}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-2">Nome</th>
              <th>E-mail</th>
              <th>Plano</th>
              <th>Perfil</th>
              <th>Jogos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-800">
                <td className="py-2">{u.name ?? '—'}</td>
                <td className="text-xs">{u.email}</td>
                <td>
                  <select
                    value={u.subscriptionStatus}
                    onChange={(e) => atualizar(u.id, { subscriptionStatus: e.target.value })}
                    className="input py-1 text-xs"
                  >
                    <option value="free">free</option>
                    <option value="active">active</option>
                    <option value="trial">trial</option>
                    <option value="canceled">canceled</option>
                    <option value="past_due">past_due</option>
                  </select>
                </td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => atualizar(u.id, { role: e.target.value })}
                    className="input py-1 text-xs"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u._count.jogos}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => atualizar(u.id, { isBlocked: !u.isBlocked })}
                    className={`text-xs ${u.isBlocked ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {u.isBlocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
