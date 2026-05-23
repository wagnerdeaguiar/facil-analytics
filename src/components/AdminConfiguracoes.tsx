'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TabelaAposta, LinhaAposta } from '@/lib/lotofacil/aposta-config';
import type { SiteResponsavel } from '@/lib/site-config';
import { formatarPrecoAposta } from '@/lib/lotofacil/aposta';
import { Upload, Save, RefreshCw } from 'lucide-react';

const DEZENAS = [15, 16, 17, 18, 19, 20] as const;

export function AdminConfiguracoes() {
  const [tabela, setTabela] = useState<TabelaAposta | null>(null);
  const [precoBase15, setPrecoBase15] = useState('3.50');
  const [responsavel, setResponsavel] = useState<SiteResponsavel>({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
  });
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [substituir, setSubstituir] = useState(true);
  const [concursoDe, setConcursoDe] = useState('');
  const [concursoAte, setConcursoAte] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string>('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [apRes, siteRes] = await Promise.all([
        fetch('/api/admin/config/apostas').then((r) => r.json()),
        fetch('/api/admin/config/site').then((r) => r.json()),
      ]);
      if (apRes.tabela) {
        setTabela(apRes.tabela);
        setPrecoBase15(String(apRes.tabela[15]?.preco ?? 3.5));
      }
      if (siteRes.responsavel) setResponsavel(siteRes.responsavel);
    } catch {
      setErro('Falha ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizarLinha(n: number, campo: keyof LinhaAposta, valor: string) {
    if (!tabela) return;
    const num = campo === 'preco' ? parseFloat(valor.replace(',', '.')) : parseInt(valor, 10);
    if (!Number.isFinite(num)) return;
    setTabela({
      ...tabela,
      [n]: { ...tabela[n as keyof TabelaAposta], [campo]: num },
    });
  }

  async function salvarApostas() {
    if (!tabela) return;
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/apostas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabela }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setTabela(data.tabela);
      setMsg('Tabela de preços salva.');
    } else {
      setErro(data.error ?? 'Erro ao salvar preços.');
    }
  }

  async function aplicarPrecoBase() {
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/apostas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precoBase15: parseFloat(precoBase15.replace(',', '.')) }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setTabela(data.tabela);
      setMsg('Preços recalculados a partir da aposta de 15 dezenas (combinações × preço base).');
    } else {
      setErro(data.error ?? 'Erro ao recalcular.');
    }
  }

  async function salvarResponsavel() {
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/site', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsavel }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setResponsavel(data.responsavel);
      setMsg('Dados do responsável salvos.');
    } else {
      setErro(data.error ?? 'Erro ao salvar responsável.');
    }
  }

  async function importarCef() {
    if (!arquivo) {
      setErro('Selecione o arquivo Lotofácil.xlsx baixado da Caixa.');
      return;
    }
    setImportando(true);
    setMsg('');
    setErro('');
    setImportResult('');
    const form = new FormData();
    form.append('arquivo', arquivo);
    form.append('substituir', substituir ? 'true' : 'false');
    if (concursoDe) form.append('concursoDe', concursoDe);
    if (concursoAte) form.append('concursoAte', concursoAte);

    const res = await fetch('/api/admin/concursos/import-xlsx', { method: 'POST', body: form });
    const data = await res.json();
    setImportando(false);
    if (res.ok) {
      setImportResult(
        `Importados ${data.inseridos} concursos (${data.substituir ? 'histórico substituído' : 'incremental'}). ` +
          `Total no banco: ${data.total}. Período: #${data.periodo.de} – #${data.periodo.ate}.`,
      );
      setMsg('Resultados atualizados com sucesso.');
      setArquivo(null);
    } else {
      setErro(data.error ?? 'Falha na importação.');
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando configurações…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Configurações da plataforma</h2>
        <button type="button" onClick={carregar} className="btn-secondary text-xs">
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
          Recarregar
        </button>
      </div>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <section className="card space-y-4">
        <h3 className="text-sm font-semibold text-brand-300">Preços das apostas (Caixa)</h3>
        <p className="text-xs text-slate-500">
          Ajuste quando a CEF alterar valores. Você pode editar cada linha ou recalcular 16–20 a partir do preço de 15
          dezenas.
        </p>

        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-800/40 p-3">
          <label className="text-xs text-slate-400">
            Preço base (15 dezenas)
            <input
              type="text"
              value={precoBase15}
              onChange={(e) => setPrecoBase15(e.target.value)}
              className="input mt-1 w-28"
            />
          </label>
          <button type="button" onClick={aplicarPrecoBase} disabled={salvando} className="btn-secondary text-xs">
            Recalcular 16–20
          </button>
        </div>

        {tabela && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Dezenas</th>
                  <th>Combinações</th>
                  <th>Preço (R$)</th>
                  <th>Referência</th>
                </tr>
              </thead>
              <tbody>
                {DEZENAS.map((n) => (
                  <tr key={n} className="border-t border-slate-700/50">
                    <td className="py-2 font-medium">{n}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={tabela[n].combinacoes}
                        onChange={(e) => atualizarLinha(n, 'combinacoes', e.target.value)}
                        className="input w-28"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={tabela[n].preco}
                        onChange={(e) => atualizarLinha(n, 'preco', e.target.value)}
                        className="input w-32"
                      />
                    </td>
                    <td className="text-slate-500">{formatarPrecoAposta(tabela[n].preco)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button type="button" onClick={salvarApostas} disabled={salvando} className="btn-primary">
          <Save className="mr-1 inline h-4 w-4" />
          Salvar tabela de preços
        </button>
      </section>

      <section className="card space-y-4">
        <h3 className="text-sm font-semibold text-brand-300">Responsável pela plataforma</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400 sm:col-span-2">
            Nome completo
            <input
              type="text"
              value={responsavel.nome}
              onChange={(e) => setResponsavel({ ...responsavel, nome: e.target.value })}
              className="input mt-1"
            />
          </label>
          <label className="text-xs text-slate-400">
            CPF (somente números)
            <input
              type="text"
              value={responsavel.cpf}
              onChange={(e) => setResponsavel({ ...responsavel, cpf: e.target.value.replace(/\D/g, '') })}
              className="input mt-1"
              maxLength={11}
            />
          </label>
          <label className="text-xs text-slate-400">
            Telefone (somente números)
            <input
              type="text"
              value={responsavel.telefone}
              onChange={(e) => setResponsavel({ ...responsavel, telefone: e.target.value.replace(/\D/g, '') })}
              className="input mt-1"
              maxLength={11}
            />
          </label>
          <label className="text-xs text-slate-400 sm:col-span-2">
            E-mail
            <input
              type="email"
              value={responsavel.email}
              onChange={(e) => setResponsavel({ ...responsavel, email: e.target.value })}
              className="input mt-1"
            />
          </label>
        </div>
        <button type="button" onClick={salvarResponsavel} disabled={salvando} className="btn-primary">
          <Save className="mr-1 inline h-4 w-4" />
          Salvar responsável
        </button>
      </section>

      <section className="card space-y-4">
        <h3 className="text-sm font-semibold text-brand-300">Importar resultados (Excel CEF)</h3>
        <p className="text-xs text-slate-500">
          Faça upload do arquivo <strong>Lotofácil.xlsx</strong> baixado em{' '}
          <a
            href="https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 underline"
          >
            loterias.caixa.gov.br
          </a>
          . Substitui todo o histórico ou adiciona apenas concursos novos.
        </p>

        <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-400 hover:border-brand-500">
          <Upload className="h-5 w-5 text-brand-400" />
          {arquivo ? arquivo.name : 'Clique para selecionar .xlsx'}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-400">
            <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} />
            Substituir histórico completo
          </label>
          <label className="text-slate-400">
            Concurso de
            <input
              type="number"
              value={concursoDe}
              onChange={(e) => setConcursoDe(e.target.value)}
              className="input ml-1 w-24"
              placeholder="opcional"
            />
          </label>
          <label className="text-slate-400">
            até
            <input
              type="number"
              value={concursoAte}
              onChange={(e) => setConcursoAte(e.target.value)}
              className="input ml-1 w-24"
              placeholder="opcional"
            />
          </label>
        </div>

        <button type="button" onClick={importarCef} disabled={importando} className="btn-primary">
          {importando ? 'Importando…' : 'Importar resultados'}
        </button>
        {importResult && <p className="text-xs text-brand-300">{importResult}</p>}
      </section>
    </div>
  );
}
