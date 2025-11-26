import React from 'react';
import { CountLog } from '../types';
import { Download, Table, Trash2, Copy, FileText, Printer } from 'lucide-react';

interface LogHistoryProps {
  logs: CountLog[];
  onClear: () => void;
  onDelete: (id: string) => void;
}

export const LogHistory: React.FC<LogHistoryProps> = ({ logs, onClear, onDelete }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const downloadCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Date", "Time", "Count", "Notes"];
    const rows = logs.map(log => {
      const date = new Date(log.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        log.count,
        log.notes || ''
      ].map(e => `"${e}"`).join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kachori_hisab_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyRow = (log: CountLog) => {
    const date = new Date(log.timestamp);
    const text = `${date.toLocaleDateString()}\t${date.toLocaleTimeString()}\t${log.count}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculate Total
  const totalCount = logs.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-xl border border-stone-200 h-full flex flex-col">
      {/* Header - Receipt Style */}
      <div className="p-5 bg-stone-50 border-b-2 border-stone-200 border-dashed flex justify-between items-center">
        <div>
           <h2 className="text-xl font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
             <FileText className="w-5 h-5 text-amber-600" />
             AAJ KA HISAAB
           </h2>
           <p className="text-xs text-stone-500 font-mono mt-1">DAILY LEDGER • {new Date().toLocaleDateString()}</p>
        </div>
        <div className="bg-amber-100 px-4 py-2 rounded border border-amber-200 text-amber-900 text-center">
           <span className="block text-xs font-bold opacity-60 uppercase">Total Qty</span>
           <span className="block text-2xl font-mono font-bold">{totalCount}</span>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200 flex justify-between items-center gap-2">
         <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{logs.length} ENTRIES</span>
         <div className="flex gap-2">
            <button 
                onClick={onClear}
                className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:text-red-600 hover:bg-stone-200 rounded transition border border-transparent hover:border-stone-300"
            >
                CLEAR DATA
            </button>
            <button 
                onClick={downloadCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-300 text-stone-700 text-xs font-bold rounded hover:bg-stone-50 transition shadow-sm"
            >
                <Printer className="w-3 h-3" />
                EXPORT CSV
            </button>
         </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 overflow-auto bg-stone-50 relative">
        {logs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-300">
            <Table className="w-16 h-16 mb-2 opacity-20" />
            <p className="font-mono text-sm uppercase">No Records Found</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-stone-200 text-stone-600 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 border-b border-stone-300">Time</th>
                <th className="px-4 py-3 border-b border-stone-300">Snap</th>
                <th className="px-4 py-3 border-b border-stone-300 text-right">Qty</th>
                <th className="px-4 py-3 border-b border-stone-300 text-right">#</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-amber-50 transition-colors group">
                  <td className="px-4 py-3 text-stone-600">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <img 
                      src={log.imageUrl} 
                      alt="Batch" 
                      className="h-8 w-12 object-cover rounded border border-stone-300 grayscale group-hover:grayscale-0 transition-all"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-stone-800 text-lg">
                    {log.count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                        onClick={() => onDelete(log.id)}
                        className="text-stone-300 hover:text-red-500 transition"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Paper Rip Effect Bottom */}
      <div className="h-4 bg-stone-100 border-t-2 border-stone-200 border-dashed rounded-b-xl"></div>
    </div>
  );
};