import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ArrowDownWideNarrow, ArrowUpWideNarrow, Info } from 'lucide-react';

const columnHelper = createColumnHelper();

// Componente para visualizar campos preenchidos automaticamente
const ExpandedFieldsPreview = ({ header, data }) => {
  // Mapeia os campos específicos que queremos mostrar para cada cabeçalho expansível
  const fieldMappings = {
    "Princípio Ativo": [
      { label: "Princípio Ativo", field: "PrincipioAtivo" },
      { label: "Classificado", field: "PrincipioAtivoClassificado" },
      { label: "Fase UGF", field: "FaseUGF" }
    ],
    "Unidade Fracionamento": [
      { label: "Unidade", field: "UnidadeFracionamento" },
      { label: "Descrição", field: "UnidadeFracionamentoDescricao" },
      { label: "Divisor", field: "Divisor" }
    ],
    "Taxas": [
      { label: "Finalidade", field: "TaxaFinalidade" },
      { label: "Tipo", field: "tipo_taxa" },
      { label: "Tempo infusão", field: "tempo_infusao" }
    ],
    "Registro Visa": [
      { label: "Cód GGrem", field: "Cod_Ggrem" },
      { label: "Laboratório", field: "Lab" },
      { label: "Status", field: "Status" }
    ],
    " Tabela ": [
      { label: "Tabela", field: "tabela" },
      { label: "Classe", field: "tabela_classe" },
      { label: "Tipo", field: "tabela_tipo" },
      { label: "Finalidade", field: "finalidade" },
      { label: "Objetivo", field: "objetivo" }
    ]
  };

  // Obtém os campos correspondentes ao cabeçalho atual
  const fields = fieldMappings[header] || [];

  // Verifica se temos dados para mostrar
  const hasData = fields.some(f => data[f.field]);
  
  if (!hasData) return null;

  return (
    <div className="bg-blue-50 p-2 my-1 rounded text-xs">
      <div className="font-semibold text-blue-700 mb-1">Campos preenchidos automaticamente:</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {fields.map(({ label, field }) => (
          data[field] ? (
            <div key={field} className="flex">
              <span className="font-medium text-gray-700">{label}:</span>
              <span className="ml-1 text-gray-900">{data[field]}</span>
            </div>
          ) : null
        ))}
      </div>
      <div className="text-xs text-blue-600 mt-1 italic">
        Estes valores foram preenchidos automaticamente, mas podem ser editados nos campos expandidos.
      </div>
    </div>
  );
};

export const DataTable = forwardRef(({ 
  data, 
  onSelectionChange, 
  selectedRows
  , 
  editingRow, 
  editedData, 
  handleInputChange, 
  handleDropdownChange, 
  isAdding, 
  newServiceData, 
  handleNewInputChange,
  handleNewDropdownChange,
  dropdownOptions,
  updateTrigger,
  sortField,
  sortOrder,
  changeSort
}, ref) => {
  const [expandedHeaders, setExpandedHeaders] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    collapseAllHeaders: () => setExpandedHeaders(new Set()),
    hasExpandedHeaders: () => expandedHeaders.size > 0,
    // Nova função para expandir um cabeçalho específico
    expandHeader: (header) => {
      setExpandedHeaders((prev) => {
        const newSet = new Set(prev);
        if (!newSet.has(header)) {
          newSet.add(header);
        }
        return newSet;
      });
    }
  }));

  // Verificação de debug
  useEffect(() => {
    if (typeof handleNewDropdownChange !== 'function') {
      console.error("ERRO: handleNewDropdownChange não é uma função!");
    }
  }, [handleNewDropdownChange]);

  // Monitorar atualizações importantes
  useEffect(() => {
    console.log('DataTable renderizando com valores importantes:');
    console.log('- updateTrigger:', updateTrigger);
    console.log('- idPrincipioAtivo:', newServiceData.idPrincipioAtivo);
    console.log('- sortField:', sortField);
    console.log('- sortOrder:', sortOrder);
  }, [updateTrigger, newServiceData, sortField, sortOrder]);

  // Debugging para mostrar o estado dos dados de edição
  useEffect(() => {
    if (editingRow) {
      console.log("Editando linha:", editingRow);
      console.log("Dados em edição:", editedData);
    }
  }, [editingRow, editedData]);

  // Mapeamento das colunas expansíveis
  const expandableHeaders = {
    "Registro Visa": [
      "RegistroVisa", "Cód GGrem", "Principio_Ativo", "Laboratório", "CNPJ Lab",
      "Classe Terapêutica", "Tipo do Produto", "Regime Preço",
      "Restrição Hosp", "Cap  ", "Confaz87", "ICMS0", "Lista", "Status"
    ],
    " Tabela ": ["Tabela", "Tabela Classe", "Tabela tipo", "Classe JaraguaSul", "Classificação tipo", "Finalidade", "Objetivo"],
    "Princípio Ativo": ["Princípio_Ativo", "Princípio_Ativo_Classificado", "FaseuGF"],
    "Unidade Fracionamento": ["Unidade_Fracionamento", "Descricao", "Divisor"],
    "Taxas": ["ID Taxa", "tipo taxa", "finalidade", "Tempo infusão"]
  };

  // Identificar quais colunas expansíveis precisam de selects
  const expansibleSelectColumns = ["Princípio Ativo", "Unidade Fracionamento", "Taxas", " Tabela "];

  // Mapeamento de cabeçalho para campo de API
  const headerToFieldMap = {
    'ID': 'id',
    'Cod': 'Cod',
    'Código TUSS': 'Codigo_TUSS',
    'Descricao_Apresentacao': 'Descricao_Apresentacao',
    'Descricao_Resumida': 'Descricao_Resumida',
    'Descricao_Comercial': 'Descricao_Comercial',
    'Concentracao': 'Concentracao',
    'Fracionamento': 'Fracionamento',
    'Laboratorio': 'Laboratorio',
    'Revisado': 'Revisado',
    'Via_Administração': 'Via_administracao',
    'Classe_Farmaceutica': 'ClasseFarmaceutica',
    'Medicamento': 'tipo_medicamento',
    'Armazenamento': 'Armazenamento',
    'FaseuGF': 'FaseUGF',
    'Unidade_Fracionamento': 'UnidadeFracionamento'
  };

  // Mapeamento de campos para subcolunas na adição
  const subFieldMapping = {
    "Registro Visa": {
      "RegistroVisa": { field: "RegistroVisa", placeholder: "", required: true },
      "Cód GGrem": { field: "Cod_Ggrem", placeholder: "" },
      "Principio_Ativo": { field: "Principio_Ativo", placeholder: "" },
      "Laboratório": { field: "Lab", placeholder: "" },
      "CNPJ Lab": { field: "cnpj_lab", placeholder: "" },
      "Classe Terapêutica": { field: "Classe_Terapeutica", placeholder: "" },
      "Tipo do Produto": { field: "Tipo_Porduto", placeholder: "" },
      "Regime Preço": { field: "Regime_Preco", placeholder: "" },
      "Restrição Hosp": { field: "Restricao_Hosp", placeholder: "" },
      "Cap  ": { field: "Cap", placeholder: "" },
      "Confaz87": { field: "Confaz87", placeholder: "" },
      "ICMS0": { field: "Icms0", placeholder: "" },
      "Lista": { field: "Lista", placeholder: "" },
      "Status": { field: "Status", placeholder: "" }
    },
    " Tabela ": {
      "Tabela": { field: "tabela", placeholder: "" },
      "Tabela Classe": { field: "tabela_classe", placeholder: "" },
      "Tabela tipo": { field: "tabela_tipo", placeholder: "" },
      "Classe JaraguaSul": { field: "classe_Jaragua_do_sul", placeholder: "" },
      "Classificação tipo": { field: "classificacao_tipo", placeholder: "" },
      "Finalidade": { field: "finalidade", placeholder: "" },
      "Objetivo": { field: "objetivo", placeholder: "" }
    },
    "Princípio Ativo": {
      "Princípio_Ativo": { field: "Principio_Ativo", placeholder: "" },
      "Princípio_Ativo_Classificado": { field: "PrincipioAtivoClassificado", placeholder: "" },
      "FaseuGF": { field: "FaseUGF", placeholder: "" }
    },
    "Unidade Fracionamento": {
      "Unidade_Fracionamento": { field: "Unidade_Fracionamento", placeholder: "" },
      "Descricao": { field: "UnidadeFracionamentoDescricao", placeholder: "" },
      "Divisor": { field: "Divisor", placeholder: "" }
    },
    "Taxas": {
      "ID Taxa": { field: "id_taxa", placeholder: "" },
      "tipo taxa": { field: "tipo_taxa", placeholder: "" },
      "finalidade": { field: "finalidade", placeholder: "" },
      "Tempo infusão": { field: "tempo_infusao", placeholder: "" }
    }
  };

  const toggleHeaderExpansion = (header) => {
    setExpandedHeaders((prev) => {
      const newSet = new Set(prev);
      newSet.has(header) ? newSet.delete(header) : newSet.add(header);
      return newSet;
    });
  };

  const handleRowClick = (rowId) => {
    onSelectionChange(rowId); // Notifica o componente pai sobre a linha selecionada
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      newSet.has(rowId) ? newSet.delete(rowId) : newSet.add(rowId);
      return newSet;
    });
  };

  // Função para ordenar a tabela quando clica em um cabeçalho
  const handleHeaderSort = (header) => {
    // Não permitir ordenação para cabeçalhos expansíveis
    if (expandableHeaders[header]) {
      return;
    }

    // Mapear o cabeçalho para o nome do campo usado no backend
    const fieldName = headerToFieldMap[header] || header.replace(/ /g, '_');
    
    // Chamar a função de ordenação do contexto
    if (typeof changeSort === 'function') {
      changeSort(fieldName);
    }
  };

  // Renderizador de cabeçalho com ícones de ordenação
  const renderSortableHeader = (header) => {
    // Para cabeçalhos expansíveis, usar o comportamento original
    if (expandableHeaders[header]) {
      return (
        <div
          className="cursor-pointer text-center font-bold flex items-center justify-center gap-2"
          onClick={() => toggleHeaderExpansion(header)}
        >
          <span style={{ color: expandedHeaders.has(header) ? "#f3df90" : "" }}>
            {header}
          </span>
          {expandedHeaders.has(header) ? 
            <ChevronUp size={16} style={{ color: expandedHeaders.has(header) ? "#f3df90" : "" }} /> : 
            <ChevronDown size={16} />
          }
        </div>
      );
    }

    // Para cabeçalhos normais, mostrar ícones de ordenação
    const fieldName = headerToFieldMap[header] || header.replace(/ /g, '_');
    const isActive = sortField === fieldName;

    return (
      <div 
      className={`header-sort ${isActive ? 'active' : ''}`}
        onClick={() => handleHeaderSort(header)}
      >
        <span>{header}</span>
        {isActive ? (
          // Mostra ícones apenas para a coluna ativa
          sortOrder === 'asc' ? 
            <ArrowUpWideNarrow size={16} style={{color: '#f3df90'}} /> : 
            <ArrowDownWideNarrow size={16} style={{color: '#f3df90'}} />
        ) : null}
      </div>
    );
  };

  const columnOrder = [
    "ID", "Cod", "Código TUSS", "Registro Visa", " Tabela ", "Via_Administração",
    "Classe_Farmaceutica", "Princípio Ativo", "Armazenamento", "Descricao_Apresentacao",
    "Descricao_Resumida", "Descricao_Comercial", "Medicamento", "Unidade Fracionamento",
    "Fator_Conversão", "Concentracao", "Fracionamento", "Laboratorio", "Taxas", "Revisado"
  ];

  // Verificador de campos preenchidos para mostrar preview
  const hasFilledRelatedFields = (header) => {
    switch(header) {
      case "Princípio Ativo":
        return Boolean(newServiceData.PrincipioAtivo || newServiceData.PrincipioAtivoClassificado);
      case "Unidade Fracionamento":
        return Boolean(newServiceData.UnidadeFracionamento || newServiceData.UnidadeFracionamentoDescricao);
      case "Taxas":
        return Boolean(newServiceData.TaxaFinalidade || newServiceData.finalidade);
      case "Registro Visa":
        return Boolean(newServiceData.Cod_Ggrem || newServiceData.Lab || newServiceData.Status);
      case " Tabela ":
        return Boolean(newServiceData.tabela_classe || newServiceData.tabela_tipo || newServiceData.finalidade);
      default:
        return false;
    }
  };

  // Função para renderizar input para célula principal em modo de adição
  const renderAddMainCell = (header) => {
    // Para colunas expansíveis que precisam de selects
    if (expandableHeaders[header] && expansibleSelectColumns.includes(header)) {
      // Especial para Princípio Ativo
      if (header === "Princípio Ativo") {
        return (
          <div>
            <select
              value={String(newServiceData.idPrincipioAtivo || '')}
              onChange={(e) => {
                console.log("Select PrincipioAtivo alterado:", e.target.value);
                handleNewDropdownChange(e, 'PrincipioAtivo');
              }}
              className="w-full p-1 border rounded mb-1"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.principioAtivo) ? 
                dropdownOptions.principioAtivo.map((principio) => (
                  <option 
                    key={`principio-${principio.idPrincipioAtivo}`} 
                    value={String(principio.idPrincipioAtivo)}
                  >
                    {principio.PrincipioAtivo}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.PrincipioAtivo && (
              <div className="text-xs text-blue-600 mt-1">
                Selecionado: {newServiceData.PrincipioAtivo}
              </div>
            )}
            
            {/* Mostrar preview de campos relacionados se não estiver expandido */}
            {hasFilledRelatedFields(header) && !expandedHeaders.has(header) && (
              <ExpandedFieldsPreview header={header} data={newServiceData} />
            )}
          </div>
        );
      }
      
      // Especial para Unidade Fracionamento
      if (header === "Unidade Fracionamento") {
        return (
          <div>
            <select
              value={String(newServiceData.idUnidadeFracionamento || '')}
              onChange={(e) => {
                console.log("Select UnidadeFracionamento alterado:", e.target.value);
                handleNewDropdownChange(e, 'UnidadeFracionamento');
              }}
              className="w-full p-1 border rounded mb-1"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.unidadeFracionamento) ? 
                dropdownOptions.unidadeFracionamento.map((un) => (
                  <option 
                    key={`un-${un.id_unidadefracionamento}`} 
                    value={String(un.id_unidadefracionamento)}
                  >
                    {un.UnidadeFracionamento}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.UnidadeFracionamento && (
              <div className="text-xs text-blue-600 mt-1">
                Selecionado: {newServiceData.UnidadeFracionamento}
              </div>
            )}
            
            {/* Mostrar preview de campos relacionados se não estiver expandido */}
            {hasFilledRelatedFields(header) && !expandedHeaders.has(header) && (
              <ExpandedFieldsPreview header={header} data={newServiceData} />
            )}
          </div>
        );
      }
      
      // Especial para Taxas
      if (header === "Taxas") {
        return (
          <div>
            <select
              value={String(newServiceData.idTaxas || '')}
              onChange={(e) => {
                console.log("Select Taxas alterado:", e.target.value);
                handleNewDropdownChange(e, 'Taxas');
              }}
              className="w-full p-1 border rounded mb-1"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.taxas) ? 
                dropdownOptions.taxas.map((taxa) => (
                  <option 
                    key={`taxa-${taxa.id_taxas}`} 
                    value={String(taxa.id_taxas)}
                  >
                    {taxa.finalidade}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.TaxaFinalidade && (
              <div className="text-xs text-blue-600 mt-1">
                Selecionado: {newServiceData.TaxaFinalidade}
              </div>
            )}
            
            {/* Mostrar preview de campos relacionados se não estiver expandido */}
            {hasFilledRelatedFields(header) && !expandedHeaders.has(header) && (
              <ExpandedFieldsPreview header={header} data={newServiceData} />
            )}
          </div>
        );
      }

      if (header === " Tabela ") {
        return (
          <div>
            <select
              value={String(newServiceData.idTabela || '')}
              onChange={(e) => {
                console.log("Select Tabela alterado:", e.target.value);
                handleNewDropdownChange(e, 'Tabela');
              }}
              className="w-full p-1 border rounded mb-1"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.tabela) ? 
                dropdownOptions.tabela.map((tab) => (
                  <option 
                    key={`tabela-${tab.id_tabela}`} 
                    value={String(tab.id_tabela)}
                  >
                    {tab.tabela}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.tabela && (
              <div className="text-xs text-blue-600 mt-1">
                Selecionado: {newServiceData.tabela}
              </div>
            )}
            
            {/* Mostrar preview de campos relacionados se não estiver expandido */}
            {hasFilledRelatedFields(header) && !expandedHeaders.has(header) && (
              <ExpandedFieldsPreview header={header} data={newServiceData} />
            )}
          </div>
        );
      }
    }
    
    // Para outras colunas expansíveis
    if (expandableHeaders[header]) {
      return (
        <div>
          <input
            type="text"
            value={newServiceData[header] || ''}
            onChange={(e) => handleNewInputChange(e, header)}
            className="w-full p-1 border rounded mb-1"
            placeholder={"..."}
            disabled={true}
          />
          
          {/* Mostrar preview de campos relacionados se não estiver expandido */}
          {hasFilledRelatedFields(header) && !expandedHeaders.has(header) && (
            <ExpandedFieldsPreview header={header} data={newServiceData} />
          )}
        </div>
      );
    }

    // Para colunas normais, escolhemos o input apropriado
    switch(header) {
      case "Cod":
        return (
          <input
            type="text"
            value={newServiceData.Cod || ''}
            onChange={(e) => handleNewInputChange(e, 'Cod')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
      case "Código TUSS":
        return (
          <input
            type="text"
            value={newServiceData.Codigo_TUSS || ''}
            onChange={(e) => handleNewInputChange(e, 'Codigo_TUSS')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Via_Administração":
        return (
          <div>
            <select
              value={String(newServiceData.idViaAdministracao || '')}
              onChange={(e) => {
                console.log("Select ViaAdministracao alterado:", e.target.value);
                handleNewDropdownChange(e, 'ViaAdministracao');
              }}
              className="w-full p-1 border rounded"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.viaAdministracao) ? 
                dropdownOptions.viaAdministracao.map((via) => (
                  <option 
                    key={`via-${via.idviaadministracao}`} 
                    value={String(via.idviaadministracao)}
                  >
                    {via.Via_administracao}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            {newServiceData.ViaAdministracao && (
              <div className="text-xs text-blue-600 mt-1">
                {newServiceData.ViaAdministracao}
              </div>
            )}
          </div>
        );
        
      case "Classe_Farmaceutica":
        return (
          <div>
            <select
              value={String(newServiceData.idClasseFarmaceutica || '')}
              onChange={(e) => {
                console.log("Select ClasseFarmaceutica alterado:", e.target.value);
                handleNewDropdownChange(e, 'ClasseFarmaceutica');
              }}
              className="w-full p-1 border rounded"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.classeFarmaceutica) ? 
                dropdownOptions.classeFarmaceutica.map((classe) => (
                  <option 
                    key={`classe-${classe.id_medicamento}`} 
                    value={String(classe.id_medicamento)}
                  >
                    {classe.ClasseFarmaceutica}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            {newServiceData.ClasseFarmaceutica && (
              <div className="text-xs text-blue-600 mt-1">
                {newServiceData.ClasseFarmaceutica}
              </div>
            )}
          </div>
        );
        
      case "Armazenamento":
        return (
          <div>
            <select
              value={String(newServiceData.idArmazenamento || '')}
              onChange={(e) => {
                console.log("Select Armazenamento alterado:", e.target.value);
                handleNewDropdownChange(e, 'Armazenamento');
              }}
              className="w-full p-1 border rounded"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.armazenamento) ? 
                dropdownOptions.armazenamento.map((arm) => (
                  <option 
                    key={`arm-${arm.idArmazenamento}`} 
                    value={String(arm.idArmazenamento)}
                  >
                    {arm.Armazenamento}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            {newServiceData.Armazenamento && (
              <div className="text-xs text-blue-600 mt-1">
                {newServiceData.Armazenamento}
              </div>
            )}
          </div>
        );
        
      case "Descricao_Apresentacao":
        return (
          <input
            type="text"
            value={newServiceData.Descricao_Apresentacao || ''}
            onChange={(e) => handleNewInputChange(e, 'Descricao_Apresentacao')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Descricao_Resumida":
        return (
          <input
            type="text"
            value={newServiceData.Descricao_Resumida || ''}
            onChange={(e) => handleNewInputChange(e, 'Descricao_Resumida')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Descricao_Comercial":
        return (
          <input
            type="text"
            value={newServiceData.Descricao_Comercial || ''}
            onChange={(e) => handleNewInputChange(e, 'Descricao_Comercial')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Medicamento":
        return (
          <div>
            <select
              value={String(newServiceData.idMedicamento || '')}
              onChange={(e) => {
                console.log("Select tipo_medicamento alterado:", e.target.value);
                handleNewDropdownChange(e, 'tipo_medicamento');
              }}
              className="w-full p-1 border rounded"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.tipoMedicamento) ? 
                dropdownOptions.tipoMedicamento.map((med) => (
                  <option 
                    key={`med-${med.id_medicamento}`} 
                    value={String(med.id_medicamento)}
                  >
                    {med.tipo_medicamento}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            {newServiceData.tipo_medicamento && (
              <div className="text-xs text-blue-600 mt-1">
                {newServiceData.tipo_medicamento}
              </div>
            )}
          </div>
        );
        
      case "Fator_Conversão":
        return (
          <div>
            <select
              value={String(newServiceData.idFatorConversao || '')}
              onChange={(e) => {
                console.log("Select FatorConversao alterado:", e.target.value);
                handleNewDropdownChange(e, 'FatorConversao');
              }}
              className="w-full p-1 border rounded"
            >
              <option value="">Selecione...</option>
              {Array.isArray(dropdownOptions?.fatorConversao) ? 
                dropdownOptions.fatorConversao.map((fator) => (
                  <option 
                    key={`fator-${fator.id_fatorconversao}`} 
                    value={String(fator.id_fatorconversao)}
                  >
                    {fator.fator}
                  </option>
                )) : 
                <option value="">Carregando opções...</option>
              }
            </select>
            {newServiceData.Fator_Conversão && (
              <div className="text-xs text-blue-600 mt-1">
                {newServiceData.Fator_Conversão}
              </div>
            )}
          </div>
        );
        
      case "Concentracao":
        return (
          <input
            type="text"
            value={newServiceData.Concentracao || ''}
            onChange={(e) => handleNewInputChange(e, 'Concentracao')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Fracionamento":
        return (
          <input
            type="text"
            value={newServiceData.Fracionamento || ''}
            onChange={(e) => handleNewInputChange(e, 'Fracionamento')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Laboratorio":
        return (
          <input
            type="text"
            value={newServiceData.Laboratorio || ''}
            onChange={(e) => handleNewInputChange(e, 'Laboratorio')}
            className="w-full p-1 border rounded"
            placeholder=""
          />
        );
        
      case "Revisado":
        return (
          <select
            value={newServiceData.Revisado || '0'}
            onChange={(e) => handleNewInputChange(e, 'Revisado')}
            className="w-full p-1 border rounded"
          >
            <option value="0">Não</option>
            <option value="1">Sim</option>
          </select>
        );
        
      default:
        // Para outros campos
        const fieldMapping = {
          "Concentracao": "Concentracao",
          "Fracionamento": "Fracionamento",
          "Laboratorio": "Laboratorio",
        };
        
        const field = fieldMapping[header] || header.replace(/ /g, '_');
        
        return (
          <input
            type="text"
            value={newServiceData[field] || ''}
            onChange={(e) => handleNewInputChange(e, field)}
            className="w-full p-1 border rounded"
            placeholder={header}
          />
        );
    }
  };

  const renderAddSubcolumnInput = (header, subHeader) => {
    // Usamos o mapeamento de subcampos
    if (subFieldMapping[header] && subFieldMapping[header][subHeader]) {
      const { field, placeholder, required } = subFieldMapping[header][subHeader];
      
      // Verificar se algum campo do RegistroVisa está preenchido
      const hasAnyRegistroVisaField = header === "Registro Visa" && Object.keys(subFieldMapping["Registro Visa"])
        .filter(
          key => key !== "RegistroVisa") // Excluir o próprio campo RegistroVisa 
        .some(key => {
          const fieldName = subFieldMapping["Registro Visa"][key].field;
          return newServiceData[fieldName] && newServiceData[fieldName].trim() !== '';
        });
      
      // Se for o campo RegistroVisa e tiver algum outro campo de RegistroVisa preenchido, destacar como obrigatório
      const isRequiredField = required || (field === "RegistroVisa" && hasAnyRegistroVisaField);
      
      // Verifica se este campo foi preenchido automaticamente
      const wasAutoFilled = newServiceData[field] && (
        (header === "Princípio Ativo" && newServiceData.idPrincipioAtivo) ||
        (header === "Unidade Fracionamento" && newServiceData.idUnidadeFracionamento) ||
        (header === "Taxas" && newServiceData.idTaxas) ||
        (header === "Registro Visa" && newServiceData.Registro_Visa) ||
        (header === " Tabela " && newServiceData.Tabela)
      );
      
      console.log(`Subcampo ${field} valor: ${newServiceData[field]} auto: ${wasAutoFilled}`);
      
      return (
        <div className="relative">
          <input
            type="text"
            value={newServiceData[field] || ''}
            onChange={(e) => handleNewInputChange(e, field)}
            className={`w-full p-1 border rounded 
                      ${wasAutoFilled ? 'bg-blue-50' : ''} 
                      ${isRequiredField ? 'border-red-500' : ''}`}
            placeholder={`${placeholder}${isRequiredField ? ' *' : ''}`}
          />
          {wasAutoFilled && (
            <div className="absolute right-0 top-0 h-full flex items-center pr-2">
              <span className="text-xs text-blue-500">Auto</span>
            </div>
          )}
          {isRequiredField && !newServiceData[field] && (
            <div className="text-xs text-red-500 mt-1">
              Este campo é obrigatório quando outros campos do Registro Visa estão preenchidos
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  const columns = useMemo(() => {
    let cols = [
      columnHelper.accessor('id', {
        header: () => renderSortableHeader('ID'),
        cell: info => {
          // Caso especial para a linha de adição
          if (isAdding && info.row.index === 0) {
            return "Novo";
          }
          return info.getValue();
        },
        size: 80,
        frozen: true,
      }),
      columnHelper.accessor('Cod', {
        header: () => renderSortableHeader('Cod'),
        cell: info => {
          // Linha de adição
          if (isAdding && info.row.index === 0) {
            return (
              <input
                type="text"
                value={newServiceData.Cod || ''}
                onChange={(e) => handleNewInputChange(e, 'Cod')}
                className="w-full p-1 border rounded"
              />
            );
          }
          
          // Linha normal em modo de edição
          const rowId = info.row.original.id;
          const isEditing = editingRow === rowId;
          return isEditing ? (
            <input
              type="text"
              value={editedData.Cod || ''}
              onChange={(e) => handleInputChange(e, 'Cod')}
              className="w-full p-1 border rounded"
            />
          ) : (
            info.getValue()
          );
        },
        size: 100,
        frozen: true,
      }),
      columnHelper.accessor('codigoTUSS', {
        header: () => renderSortableHeader('Código TUSS'),
        cell: info => {
          // Linha de adição
          if (isAdding && info.row.index === 0) {
            return (
              <input
                type="text"
                value={newServiceData.Codigo_TUSS || ''}
                onChange={(e) => handleNewInputChange(e, 'Codigo_TUSS')}
                className="w-full p-1 border rounded"
              />
            );
          }
          
          // Linha normal em modo de edição
          const rowId = info.row.original.id;
          const isEditing = editingRow === rowId;
          return isEditing ? (
            <input
              type="text"
              value={editedData.codigoTUSS || ''}
              onChange={(e) => handleInputChange(e, 'codigoTUSS')}
              className="w-full p-1 border rounded"
            />
          ) : (
            info.getValue()
          );
        },
        size: 120,
        frozen: true,
      }),
    ];

    columnOrder.slice(3).forEach((header) => {
      if (expandableHeaders[header]) {
        cols.push({
          header: () => renderSortableHeader(header),
          accessorKey: header,
          size: 150,
          cell: info => {
            // Linha de adição
            if (isAdding && info.row.index === 0) {
              return renderAddMainCell(header);
            }
            
            // Linha normal
            const rowId = info.row.original.id;
            const isEditing = editingRow === rowId;
            
            if (isEditing) {
              // Se é uma coluna com select, renderizamos o select apropriado
              if (expansibleSelectColumns.includes(header)) {
                switch(header) {
                  case "Princípio Ativo":
                    return (
                      <div>
                        <select
                          value={
                            editedData.idPrincipioAtivo || 
                            (editedData["Princípio Ativo"] ? 
                              Array.isArray(dropdownOptions?.principioAtivo) && 
                              dropdownOptions.principioAtivo.find(p => p.PrincipioAtivo === editedData["Princípio Ativo"])?.idPrincipioAtivo || ''
                              : '')
                          }
                          onChange={(e) => handleDropdownChange(e, 'PrincipioAtivo')}
                          className="w-full p-1 border rounded mb-1"
                        >
                          <option value="">Selecione...</option>
                          {Array.isArray(dropdownOptions?.principioAtivo) ? 
                            dropdownOptions.principioAtivo.map((principio, index) => (
                              <option key={`edit-principio-${principio.idPrincipioAtivo}-${index}`} value={principio.idPrincipioAtivo}>
                                {principio.PrincipioAtivo}
                              </option>
                            )) : 
                            <option value="">Carregando opções...</option>
                          }
                        </select>
                        {editedData.Principio_Ativo && !expandedHeaders.has(header) && (
                          <div className="text-xs text-blue-600 mt-1">
                            Modificado: {editedData.Principio_Ativo}
                          </div>
                        )}
                      </div>
                    );
                    
                  case "Unidade Fracionamento":
                    return (
                      <div>
                        <select
                          value={
                            editedData.idUnidadeFracionamento || 
                            (editedData.Unidade_Fracionamento ? 
                              Array.isArray(dropdownOptions?.unidadeFracionamento) && 
                              dropdownOptions.unidadeFracionamento.find(u => u.UnidadeFracionamento === editedData.Unidade_Fracionamento)?.id_unidadefracionamento || ''
                              : '')
                          }
                          onChange={(e) => handleDropdownChange(e, 'UnidadeFracionamento')}
                          className="w-full p-1 border rounded mb-1"
                        >
                          <option value="">Selecione...</option>
                          {Array.isArray(dropdownOptions?.unidadeFracionamento) ? 
                            dropdownOptions.unidadeFracionamento.map((un, index) => (
                              <option key={`edit-un-${un.id_unidadefracionamento}-${index}`} value={un.id_unidadefracionamento}>
                                {un.UnidadeFracionamento}
                              </option>
                            )) : 
                            <option value="">Carregando opções...</option>
                          }
                        </select>
                        {editedData.Unidade_Fracionamento && !expandedHeaders.has(header) && (
                          <div className="text-xs text-blue-600 mt-1">
                            Modificado: {editedData.Unidade_Fracionamento}
                          </div>
                        )}
                      </div>
                    );
                    
                  case "Taxas":
                    return (
                      <div>
                        <select
                          value={
                            editedData.idTaxas || 
                            (editedData.finalidade ? 
                              Array.isArray(dropdownOptions?.taxas) && 
                              dropdownOptions.taxas.find(t => t.finalidade === editedData.finalidade)?.id_taxas || ''
                              : '')
                          }
                          onChange={(e) => handleDropdownChange(e, 'Taxas')}
                          className="w-full p-1 border rounded mb-1"
                        >
                          <option value="">Selecione...</option>
                          {Array.isArray(dropdownOptions?.taxas) ? 
                            dropdownOptions.taxas.map((taxa, index) => (
                              <option key={`edit-taxa-${taxa.id_taxas}-${index}`} value={taxa.id_taxas}>
                                {taxa.finalidade}
                              </option>
                            )) : 
                            <option value="">Carregando opções...</option>
                          }
                        </select>
                        {editedData.finalidade && !expandedHeaders.has(header) && (
                          <div className="text-xs text-blue-600 mt-1">
                            Modificado: {editedData.finalidade}
                          </div>
                        )}
                      </div>
                    );

                    case " Tabela ":
                      return (
                        <div>
                          <select
                            value={
                              editedData.idTabela || 
                              (editedData.tabela ? 
                                Array.isArray(dropdownOptions?.tabela) && 
                                dropdownOptions.tabela.find(t => t.tabela === editedData.tabela)?.id_tabela || ''
                                : '')
                            }
                            onChange={(e) => handleDropdownChange(e, 'Tabela')}
                            className="w-full p-1 border rounded mb-1"
                          >
                            <option value="">Selecione...</option>
                            {Array.isArray(dropdownOptions?.tabela) ? 
                              dropdownOptions.tabela.map((tab, index) => (
                                <option key={`edit-tabela-${tab.id_tabela}-${index}`} value={tab.id_tabela}>
                                  {tab.tabela}
                                </option>
                              )) : 
                              <option value="">Carregando opções...</option>
                            }
                          </select>
                          {editedData.tabela && !expandedHeaders.has(header) && (
                            <div className="text-xs text-blue-600 mt-1">
                              Modificado: {editedData.tabela}
                            </div>
                          )}
                        </div>
                      );
                    
                  default:
                    return (
                      <input
                        type="text"
                        value={editedData[header] || ''}
                        onChange={(e) => handleInputChange(e, header)}
                        className="w-full p-1 border rounded"
                      />
                    );
                }
              } else {
                // Para outras colunas expansíveis em modo de edição
                return (
                  <input
                    type="text"
                    value={editedData[header] || ''}
                    onChange={(e) => handleInputChange(e, header)}
                    className="w-full p-1 border rounded"
                  />
                );
              }
            } else {
              // Modo de visualização normal
              return (
                <div onClick={() => toggleRowExpansion(info.row.id)} className="cursor-pointer">
                  <div>{expandedRows.has(info.row.id) ? info.getValue() : '...'}</div>
                  {expandedRows.has(info.row.id) && (
                    <div className="mt-2 pl-4 border-l-2 border-primary-light">
                      <div className="mb-2">
                      <div className="font-medium text-sm"></div>
                        <div>{info.row.original[header]}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          },
        });

        if (expandedHeaders.has(header)) {
          expandableHeaders[header].forEach((sub) => {
            cols.push({
              header: sub,
              accessorKey: sub,
              size: 120,
              cell: info => {
                // Linha de adição
                if (isAdding && info.row.index === 0) {
                  return renderAddSubcolumnInput(header, sub);
                }
                
                // Linha normal
                const rowId = info.row.original.id;
                const isEditing = editingRow === rowId;
                
                // Verificamos se este campo foi preenchido automaticamente durante a edição
                const wasAutoFilled = editedData[sub] && 
                  ((header === "Princípio Ativo" && editedData.idPrincipioAtivo) ||
                   (header === "Unidade Fracionamento" && editedData.idUnidadeFracionamento) ||
                   (header === "Taxas" && editedData.idTaxas));
                
                return isEditing ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={editedData[sub] || ''}
                      onChange={(e) => handleInputChange(e, sub)}
                      className={`w-full p-1 border rounded ${wasAutoFilled ? 'bg-blue-50' : ''}`}
                    />
                      {wasAutoFilled && (
                        <div className="absolute right-0 top-0 h-full flex items-center pr-2">
                          <span className="text-xs text-blue-500">Auto</span>
                        </div>
                      )}
                  </div>
                ) : (
                  info.getValue()
                );
              },
            });
          });
        }
      } else {
        cols.push({
          header: () => renderSortableHeader(header),
          accessorKey: header.replace(/ /g, '_'),
          size: 120,
          cell: info => {
            // Linha de adição
            if (isAdding && info.row.index === 0) {
              return renderAddMainCell(header);
            }
            
            // Linha normal
            const rowId = info.row.original.id;
            const isEditing = editingRow === rowId;
            
            // Verificar se o campo precisa de um select
            const needsSelect = [
              "Via_Administração", "Classe_Farmaceutica", "Princípio Ativo", 
              "Armazenamento", "Medicamento", "Unidade Fracionamento", 
              "Fator_Conversão", "Taxas"
            ].includes(header);
            
            if (isEditing && needsSelect) {
              // Retornar um select baseado no tipo de campo
              switch(header) {
                case "Via_Administração":
                  return (
                    <div>
                      <select
                        value={
                          editedData.idViaAdministracao || 
                          (editedData.Via_Administração ? 
                            Array.isArray(dropdownOptions?.viaAdministracao) && 
                            dropdownOptions.viaAdministracao.find(v => v.Via_administracao === editedData.Via_Administração)?.idviaadministracao || ''
                            : '')
                        }
                        onChange={(e) => handleDropdownChange(e, 'ViaAdministracao')}
                        className="w-full p-1 border rounded mb-1"
                      >
                        <option value="">Selecione...</option>
                        {Array.isArray(dropdownOptions?.viaAdministracao) ? 
                          dropdownOptions.viaAdministracao.map((via, index) => (
                            <option key={`edit-via-${via.idviaadministracao}-${index}`} value={via.idviaadministracao}>
                              {via.Via_administracao}
                            </option>
                          )) : 
                          <option value="">Carregando opções...</option>
                        }
                      </select>
                      {editedData.Via_Administração && (
                        <div className="text-xs text-blue-600 mt-1">
                          {editedData.Via_Administração}
                        </div>
                      )}
                    </div>
                  );
                  
                // Outros cases para selects
                case "Classe_Farmaceutica":
                  return (
                    <div>
                      <select
                        value={
                          editedData.idClasseFarmaceutica || 
                          (editedData.Classe_Farmaceutica ? 
                            Array.isArray(dropdownOptions?.classeFarmaceutica) && 
                            dropdownOptions.classeFarmaceutica.find(c => c.ClasseFarmaceutica === editedData.Classe_Farmaceutica)?.id_medicamento || ''
                            : '')
                        }
                        onChange={(e) => handleDropdownChange(e, 'ClasseFarmaceutica')}
                        className="w-full p-1 border rounded mb-1"
                      >
                        <option value="">Selecione...</option>
                        {Array.isArray(dropdownOptions?.classeFarmaceutica) ? 
                          dropdownOptions.classeFarmaceutica.map((classe, index) => (
                            <option key={`edit-classe-${classe.id_medicamento}-${index}`} value={classe.id_medicamento}>
                              {classe.ClasseFarmaceutica}
                            </option>
                          )) : 
                          <option value="">Carregando opções...</option>
                        }
                      </select>
                    </div>
                  );
                
                default:
                  return (
                    <input
                      type="text"
                      value={editedData[header.replace(/ /g, '_')] || ''}
                      onChange={(e) => handleInputChange(e, header.replace(/ /g, '_'))}
                      className="w-full p-1 border rounded"
                    />
                  );
              }
            } else {
              return isEditing ? (
                <input
                  type="text"
                  value={editedData[header.replace(/ /g, '_')] || ''}
                  onChange={(e) => handleInputChange(e, header.replace(/ /g, '_'))}
                  className="w-full p-1 border rounded"
                />
              ) : (
                info.getValue()
              );
            }
          },
        });
      }
    });

    return cols;
  }, [expandedHeaders, expandedRows, editingRow, editedData, handleInputChange, handleDropdownChange, 
      dropdownOptions, isAdding, newServiceData, sortField, sortOrder]);

  // Preparar dados para incluir a linha de adição
  const tableData = useMemo(() => {
    if (!isAdding) return data;
    
    // Criar um objeto vazio para a linha de adição 
    // Usamos um ID especial para identificá-la
    const addRow = { id: 'add-new-row' };
    
    return [addRow, ...data];
  }, [isAdding, data]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div 
      className={`table-container data-table-container ${isAdding ? 'adding-mode' : ''}`} 
      style={{ overflowX: 'auto', maxWidth: '100%', whiteSpace: 'nowrap' }}
    >
      <table className="table-auto w-full data-table border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="border px-4 py-2 text-center"
                  style={{ width: header.column.columnDef.size, minWidth: header.column.columnDef.size }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => {
            // Verificar se é a linha de adição (primeira linha quando isAdding=true)
            if (isAdding && row.original.id === 'add-new-row') {
              return (
                <tr 
                  key={row.id}
                  className="adding-row"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="border px-4 py-2 text-center">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            }
            
            // Renderização normal para linhas de dados existentes
            const rowId = row.original.id;
            const isSelected = selectedRows.has(rowId);
            return (
              <tr
                key={row.id}
                onClick={() => handleRowClick(rowId)}
                className={`cursor-pointer-aqui ${isSelected ? '' : 'hover:bg-gray-300'}`}
                style={{
                  backgroundColor: isSelected ? '#E8E351' : undefined,
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="border px-4 py-2 text-center">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

DataTable.displayName = 'DataTable';