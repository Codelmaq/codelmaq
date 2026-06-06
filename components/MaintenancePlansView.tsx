import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

export const MaintenancePlansView = ({ templates = [], onAddTemplate, onEditTemplate, onRemoveTemplate, onImportInitialTemplates }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: '' });
  const [formData, setFormData] = useState({
    model: '',
    interval: 500,
    revision_name: '',
    items: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsArray = formData.items.split('\n').map(i => i.trim()).filter(i => i);
    
    const templateData = {
      model: formData.model.toUpperCase(),
      interval: Number(formData.interval),
      revision_name: formData.revision_name,
      items: itemsArray
    };

    if (editingTemplate) {
      onEditTemplate({ ...templateData, id: editingTemplate.id });
    } else {
      onAddTemplate(templateData);
    }
    setIsModalOpen(false);
  };

  const openEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      model: template.model,
      interval: template.interval,
      revision_name: template.revision_name || `Revisão ${template.interval}h`,
      items: template.items.join('\n')
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormData({
      model: '',
      interval: 500,
      revision_name: '',
      items: ''
    });
    setIsModalOpen(true);
  };

  // Group templates by model
  const groupedTemplates = templates.reduce((acc: any, curr: any) => {
    if (!acc[curr.model]) acc[curr.model] = [];
    acc[curr.model].push(curr);
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col gap-3 bg-gray-50 dark:bg-[#101010]">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <FileText className="mr-2 text-blue-600" /> Planos de Manutenção Preventiva
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie os itens de troca obrigatória por modelo e horímetro.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button 
            onClick={onImportInitialTemplates}
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
          >
            <RefreshCw size={16} className="mr-2" /> Sincronizar Planos Padrão
          </button>
          <button 
            onClick={openNew}
            className="bg-black hover:bg-neutral-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
          >
            <Plus size={16} className="mr-2" /> Novo Plano
          </button>
        </div>
      </div>

      <div className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-[#101010] rounded-lg border border-dashed border-gray-300">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">Nenhum plano cadastrado</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">Clique em &quot;Sincronizar Planos Padrão&quot; para carregar as regras da frota.</p>
            <button 
              onClick={onImportInitialTemplates}
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg transition-colors text-sm inline-flex items-center"
            >
              <RefreshCw size={16} className="mr-2" /> Sincronizar Planos Padrão
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedTemplates).sort().map(model => (
              <div key={model} className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                <div className="bg-gray-800 text-white px-4 py-3 font-bold flex justify-between items-center">
                  <span>Modelo: {model}</span>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">{groupedTemplates[model].length} planos</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedTemplates[model].sort((a: any, b: any) => a.interval - b.interval).map((template: any, index: number) => (
                    <div key={template.id || `template-${model}-${template.interval}-${index}`} className="p-4 hover:bg-gray-50 dark:bg-[#101010] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-blue-800">{template.revision_name || `Revisão ${template.interval}h`}</h4>
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-mono mt-1">
                            Intervalo Base: {template.interval}h
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(template)} className="text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ isOpen: true, id: template.id })} className="text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Itens de Troca Obrigatória:</h5>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-200 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                          {template.items.map((item: string, idx: number) => (
                            <li key={idx} className="truncate" title={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] max-w-[90vw] overflow-y-auto p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Excluir Plano?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Tem certeza que deseja excluir este plano de manutenção? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm({ isOpen: false, id: '' })} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1e1e1e] font-semibold rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={() => {
                onRemoveTemplate(deleteConfirm.id);
                setDeleteConfirm({ isOpen: false, id: '' });
              }} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-2xl max-w-[90vw] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-[#101010]">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {editingTemplate ? 'Editar Plano de Manutenção' : 'Novo Plano de Manutenção'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modelo da Máquina</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: PC 210, WA 200, GERAL"
                    className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use &quot;GERAL&quot; para aplicar a todos os modelos não especificados.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Intervalo Base (Horas)</label>
                  <select 
                    required
                    className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.interval}
                    onChange={e => setFormData({...formData, interval: Number(e.target.value)})}
                  >
                    <option value={500}>500h (Básica)</option>
                    <option value={1000}>1000h (Intermediária)</option>
                    <option value={2000}>2000h (Avançada)</option>
                    <option value={4000}>4000h (Alta Severidade)</option>
                    <option value={5000}>5000h (Renovação Hidráulica)</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome da Revisão</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: REVISÃO BÁSICA (500h)"
                  className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.revision_name}
                  onChange={e => setFormData({...formData, revision_name: e.target.value})}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Itens de Troca (Um por linha)</label>
                <textarea 
                  required
                  rows={8}
                  placeholder="Óleo do motor&#10;Filtro de óleo do motor&#10;Filtro de combustível..."
                  className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  value={formData.items}
                  onChange={e => setFormData({...formData, items: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:bg-[#1e1e1e] rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center"
                >
                  <Save size={16} className="mr-2" /> Salvar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
