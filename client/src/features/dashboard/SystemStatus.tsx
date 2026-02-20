import React, { useEffect, useState } from 'react';
import { apiService } from '@/shared/services/apiService';

interface Route {
    method: string;
    path: string;
    name: string;
}

interface TableInfo {
    name: string;
    rowCount: number;
    columns?: string[];
}

interface SystemStatusProps { }

const SystemStatus: React.FC<SystemStatusProps> = () => {
    const [activeTab, setActiveTab] = useState<'audit' | 'routes' | 'database'>('audit');
    const [routes, setRoutes] = useState<Route[]>([]);
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<any[]>([]);
    const [tableStats, setTableStats] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRoutes();
        fetchTables();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            fetchTableData(selectedTable);
        }
    }, [selectedTable]);

    const fetchRoutes = async () => {
        try {
            const data = await apiService.getSystemRoutes();
            setRoutes(data);
        } catch (err) {
            console.error('Failed to fetch routes', err);
        }
    };

    const fetchTables = async () => {
        try {
            const data = await apiService.getSystemTables();
            setTables(data);
            if (data.length > 0 && !selectedTable) {
                setSelectedTable(data[0]);
            }

            // Fetch row counts for all tables
            const stats: TableInfo[] = [];
            for (const tableName of data) {
                try {
                    const tableRows = await apiService.getSystemTableData(tableName);
                    stats.push({
                        name: tableName,
                        rowCount: tableRows?.length || 0,
                        columns: tableRows.length > 0 ? Object.keys(tableRows[0]) : []
                    });
                } catch {
                    stats.push({ name: tableName, rowCount: 0, columns: [] });
                }
            }
            setTableStats(stats);
        } catch (err) {
            console.error('Failed to fetch tables', err);
        }
    };

    const fetchTableData = async (tableName: string) => {
        setLoading(true);
        setError('');
        try {
            const data = await apiService.getSystemTableData(tableName);
            setTableData(data);
        } catch (err) {
            setError('Erro ao carregar dados da tabela');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const totalRows = tableStats.reduce((sum, t) => sum + t.rowCount, 0);

    // System architecture info
    const systemInfo = {
        backend: {
            framework: 'Go Fiber',
            database: 'SQLite (Local)',
            orm: 'GORM',
            auth: 'JWT + bcrypt'
        },
        frontend: {
            framework: 'React 18',
            language: 'TypeScript',
            styling: 'Tailwind CSS',
            routing: 'React Router'
        },
        security: {
            auth: 'JWT com refresh tokens',
            encryption: 'bcrypt para senhas',
            cors: 'Configurável por ambiente'
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Auditoria do Sistema</h1>
                <p className="text-sm text-slate-500">Visão completa do frontend, backend, storage e banco de dados</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/30">
                    <div className="text-3xl font-black">{tables.length}</div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Tabelas</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/30">
                    <div className="text-3xl font-black">{totalRows}</div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Registros</div>
                </div>
                <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-4 text-white shadow-lg shadow-sky-500/30">
                    <div className="text-3xl font-black">{routes.length}</div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Endpoints</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-500/30">
                    <div className="text-3xl font-black">4</div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Perfis</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 bg-slate-100 p-1 rounded-xl">
                <button
                    className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'audit'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('audit')}
                >
                    📊 Visão Geral
                </button>
                <button
                    className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'routes'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('routes')}
                >
                    🔗 Rotas API ({routes.length})
                </button>
                <button
                    className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'database'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('database')}
                >
                    🗄️ Banco de Dados
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                {/* AUDIT TAB */}
                {activeTab === 'audit' && (
                    <div className="p-6 space-y-6">
                        {/* Architecture Overview */}
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Arquitetura do Sistema</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="text-lg">⚙️</span>
                                        </div>
                                        <h4 className="font-bold text-slate-700">Backend</h4>
                                    </div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li><span className="font-medium">Framework:</span> {systemInfo.backend.framework}</li>
                                        <li><span className="font-medium">Database:</span> {systemInfo.backend.database}</li>
                                        <li><span className="font-medium">ORM:</span> {systemInfo.backend.orm}</li>
                                        <li><span className="font-medium">Auth:</span> {systemInfo.backend.auth}</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                                            <span className="text-lg">💻</span>
                                        </div>
                                        <h4 className="font-bold text-slate-700">Frontend</h4>
                                    </div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li><span className="font-medium">Framework:</span> {systemInfo.frontend.framework}</li>
                                        <li><span className="font-medium">Linguagem:</span> {systemInfo.frontend.language}</li>
                                        <li><span className="font-medium">Estilização:</span> {systemInfo.frontend.styling}</li>
                                        <li><span className="font-medium">Rotas:</span> {systemInfo.frontend.routing}</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                                            <span className="text-lg">🔒</span>
                                        </div>
                                        <h4 className="font-bold text-slate-700">Segurança</h4>
                                    </div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li><span className="font-medium">Autenticação:</span> {systemInfo.security.auth}</li>
                                        <li><span className="font-medium">Criptografia:</span> {systemInfo.security.encryption}</li>
                                        <li><span className="font-medium">CORS:</span> {systemInfo.security.cors}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Tables Overview */}
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Estrutura do Banco de Dados</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tabela</th>
                                            <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Registros</th>
                                            <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Campos</th>
                                            <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableStats.map((table) => (
                                            <tr key={table.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                                            </svg>
                                                        </div>
                                                        <span className="font-bold text-slate-800">{table.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${table.rowCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {table.rowCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-500">
                                                    {table.columns?.length || 0} campos
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => { setActiveTab('database'); setSelectedTable(table.name); }}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                                    >
                                                        Ver dados →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* User Roles */}
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Perfis de Usuário</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
                                    <div className="text-rose-600 font-black text-sm mb-1">ADMIN_SISTEMA</div>
                                    <p className="text-xs text-rose-500">Acesso total ao sistema</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                    <div className="text-blue-600 font-black text-sm mb-1">PRESTADOR</div>
                                    <p className="text-xs text-blue-500">Gestão da empresa</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                                    <div className="text-amber-600 font-black text-sm mb-1">TECNICO</div>
                                    <p className="text-xs text-amber-500">Execução de serviços</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                                    <div className="text-emerald-600 font-black text-sm mb-1">CLIENTE</div>
                                    <p className="text-xs text-emerald-500">Solicitar serviços</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ROUTES TAB */}
                {activeTab === 'routes' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Método</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Caminho</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Handler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {routes.map((route, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase
                                                ${route.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                                                route.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                                                route.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                                                route.method === 'PATCH' ? 'bg-indigo-100 text-indigo-700' :
                                                route.method === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {route.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-mono">{route.path}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{route.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* DATABASE TAB */}
                {activeTab === 'database' && (
                    <div className="p-6">
                        <div className="mb-4 flex items-center gap-4">
                            <label className="text-sm font-bold text-slate-700">Tabela:</label>
                            <select
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className="block w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {tables.map((table) => (
                                    <option key={table} value={table}>{table}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => fetchTableData(selectedTable)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                                Atualizar
                            </button>
                            <span className="text-sm text-slate-500">{tableData.length} registros</span>
                        </div>

                        {loading ? (
                            <div className="text-center py-20">
                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-400 font-medium">Carregando dados...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20 text-rose-500 font-medium">{error}</div>
                        ) : tableData.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-medium">Tabela vazia</div>
                        ) : (
                            <div className="overflow-x-auto max-h-[500px] rounded-xl border border-slate-100">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            {Object.keys(tableData[0]).map((key) => (
                                                <th key={key} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {tableData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                {Object.values(row).map((val: any, i) => (
                                                    <td key={i} className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 max-w-xs truncate" title={String(val)}>
                                                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemStatus;
