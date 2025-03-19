import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef, useRef, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ArrowDownWideNarrow, ArrowUpWideNarrow, Info, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="auto-filled-fields-container" onClick={(e) => e.stopPropagation()}>
      <div className="auto-filled-fields-header">Campos preenchidos automaticamente:</div>
      <div className="auto-filled-fields-grid">
        {fields.map(({ label, field }) => (
          data[field] ? (
            <div key={field} className="auto-filled-field-item">
              <span className="auto-filled-field-label">{label}:</span>
              <span className="auto-filled-field-value">{data[field]}</span>
            </div>
          ) : null
        ))}
      </div>
      <div className="auto-filled-fields-note">
        Estes valores foram preenchidos automaticamente, mas podem ser editados nos campos expandidos.
      </div>
    </div>
  );
};

// Componente de célula editável
const EditableCell = ({ 
  value: initialValue,
  rowId,
  columnId,
  onUpdate,
  dropdownOptions,
  isDropdown,
  dropdownType,
  onDropdownChange, // Nova prop para lidar especificamente com dropdowns
  isNew // Flag para indicar se é uma célula de adição ou edição
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);
  
  // Focar automaticamente quando montado
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleBlur = () => {
    // Para inputs normais, usamos o onUpdate normal
    if (!isDropdown) {
      onUpdate(rowId, columnId, value);
    }
  };
  
  const handleDropdownChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Para dropdowns, chamamos onDropdownChange para permitir autopreenchimento
    if (isDropdown && onDropdownChange) {
      onDropdownChange(e, dropdownType, rowId === 'new-row');
    }
  };
  
  const handleClick = (e) => {
    e.stopPropagation();
  };
  
  if (isDropdown) {
    return (
      <select
        ref={inputRef}
        value={value || ''}
        onChange={handleDropdownChange}
        onBlur={handleBlur}
        onClick={handleClick}
        className="select-styled w-full p-1 border rounded"
        data-dropdown-type={dropdownType} // Adicionando atributo para identificar o tipo de dropdown
        style={{
          color: '#f1f1f1', 
          zIndex: 1000,
          backgroundColor: '#f68484',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          textAlign: 'left' // Garantir alinhamento à esquerda
        }}
      >
        <option value="" style={{ color: '#333', textAlign: 'left', paddingLeft: '5px' }}>Selecione...</option>
        {dropdownOptions?.map((option) => (
          <option 
            key={`${option.value}-${option.label}`} 
            value={option.value} 
            style={{ 
              color: '#333', 
              textAlign: 'left', 
              paddingLeft: '5px',
              backgroundColor: 'white'
            }}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  
  return (
    <input
      ref={inputRef}
      value={value || ''}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onClick={handleClick}
      className="w-full p-1 border rounded"
      style={{
        backgroundColor: '#f68484',
        color: '#f1f1f1',
        borderColor: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center'
      }}
    />
  );
};

const MemoizedEditableCell = memo(EditableCell);

// Estilo global para selects
const selectStyles = `
  select option {
    color: #333 !important;
    text-align: left !important;
    padding-left: 5px;
    background-color: white;
  }

  select {
    text-align: left !important;
  }

  /* Estilo específico para as opções do select de Princípio Ativo */
  select[data-dropdown-type="PrincipioAtivo"] option {
    padding-left: 8px;
    padding-top: 4px;
    padding-bottom: 4px;
  }
`;

export const DataTable = forwardRef(({ 
  data, 
  onSelectionChange, 
  selectedRows, 
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
  
  // Estado para rastrear a célula em edição
  const [editingCell, setEditingCell] = useState({
    rowId: null,
    columnId: null,
    value: null,
    isDropdown: false,
    dropdownType: null
  });

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

  // Funções para controlar a edição de células
  const startEditing = (rowId, columnId, initialValue, isDropdown = false, dropdownType = null) => {
    setEditingCell({
      rowId,
      columnId,
      value: initialValue,
      isDropdown,
      dropdownType
    });
  };

  const handleCellUpdate = (rowId, columnId, newValue) => {
    if (rowId === 'new-row') {
      // Verifica se este campo deve ser tratado como apenas visual
      const skipFields = ['UnidadeFracionamento', 'Unidade_Fracionamento']; 
      if (!skipFields.includes(columnId)) {
        handleNewInputChange({ target: { value: newValue } }, columnId);
      }
    } else {
      handleInputChange({ target: { value: newValue } }, columnId);
    }
    setEditingCell({ rowId: null, columnId: null, value: null });
  };

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

  const handleRowClick = (rowId, e) => {
    // Não selecionar se estamos editando uma célula
    if (editingCell.rowId !== null) return;
    
    // Não selecionar se estamos clicando em um input ou select
    if (e && (
      e.target.tagName === 'INPUT' || 
      e.target.tagName === 'SELECT' ||
      e.target.closest('input') ||
      e.target.closest('select')
    )) {
      e.stopPropagation();
      return;
    }
    
    // Não permitir mudança de seleção durante edição
    if (editingRow || isAdding) return;
    
    onSelectionChange(rowId);
  };

  const toggleRowExpansion = (rowId, e) => {
    if (e) e.stopPropagation();
    
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
          onClick={(e) => {
            e.stopPropagation();
            toggleHeaderExpansion(header);
          }}
        >
          <span style={{ color: expandedHeaders.has(header) ? "#f1f1f1" : "" }}>
            {header}
          </span>
          {expandedHeaders.has(header) ? 
            <ChevronRight  size={16} style={{ color: expandedHeaders.has(header) ? "#f1f1f1" : "" }}  /> : 
            <ChevronLeft size={16} />
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
        onClick={(e) => {
          e.stopPropagation();
          handleHeaderSort(header);
        }}
      >
        <span>{header}</span>
        {isActive ? (
          // Mostra ícones apenas para a coluna ativa
          sortOrder === 'asc' ? 
            <ArrowUpWideNarrow size={16} style={{color: '#f26b6b'}} /> : 
            <ArrowDownWideNarrow size={16} style={{color: '#f26b6b'}} />
        ) : null}
      </div>
    );
  };

  // Esta função auxiliar verifica se um cabeçalho é uma subcoluna de um cabeçalho expandido
  // Modifique esta função para ser mais tolerante a variações de nome
  const isSubcolumnOfExpandedHeader = (columnName) => {
    // Normaliza o nome da coluna para comparação (remove acentos, espaços, etc.)
    const normalizeColumnName = (name) => {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[_\s]/g, ""); // Remove espaços e sublinhados
    };

    const normalizedColumnName = normalizeColumnName(columnName);
    
    for (const [header, subColumns] of Object.entries(expandableHeaders)) {
      if (expandedHeaders.has(header)) {
        // Verifica se alguma subcoluna corresponde à coluna atual (após normalização)
        const found = subColumns.some(subCol => 
          normalizeColumnName(subCol) === normalizedColumnName ||
          // Tenta outras variações comuns
          normalizeColumnName(subCol.replace('_', ' ')) === normalizedColumnName ||
          columnName.includes(subCol) ||
          subCol.includes(columnName)
        );
        
        if (found) return true;
      }
    }
    return false;
  };

  // Adicione este código temporariamente para depuração
  useEffect(() => {
    if (expandedHeaders.size > 0) {
      console.log("Cabeçalhos expandidos:", Array.from(expandedHeaders));
      
      // Imprime todas as colunas da tabela com seus IDs
      if (table.getAllColumns) {
        const allColumns = table.getAllColumns();
        console.log("Todas as colunas:", allColumns.map(col => ({ 
          id: col.id, 
          accessorKey: col.columnDef.accessorKey 
        })));
      }
    }
  }, [expandedHeaders]);

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

  // Função para criar opções de dropdown baseadas no tipo
  const getDropdownOptions = (type) => {
    switch(type) {
      case 'PrincipioAtivo':
        if (Array.isArray(dropdownOptions?.principioAtivo)) {
          return dropdownOptions.principioAtivo.map(principio => ({
            value: principio.idPrincipioAtivo,
            label: principio.PrincipioAtivo
          }));
        }
        break;
      case 'UnidadeFracionamento':
        if (Array.isArray(dropdownOptions?.unidadeFracionamento)) {
          return dropdownOptions.unidadeFracionamento.map(un => ({
            value: un.id_unidadefracionamento,
            label: un.Descricao ? `${un.Descricao} (${un.UnidadeFracionamento})` : un.UnidadeFracionamento
          }));
        }
        break;
      case 'Taxas':
        if (Array.isArray(dropdownOptions?.taxas)) {
          return dropdownOptions.taxas.map(taxa => ({
            value: taxa.id_taxas,
            label: taxa.finalidade
          }));
        }
        break;
        case 'Tabela':
          if (Array.isArray(dropdownOptions?.tabela)) {
            return dropdownOptions.tabela.map(tab => ({
              value: tab.id_tabela,
              // Modificação aqui: combina tabela + finalidade, se a finalidade existir
              label: tab.finalidade 
                ? `${tab.tabela} + ${tab.finalidade}` 
                : tab.tabela
            }));
          }
          break;
      case 'ViaAdministracao':
        if (Array.isArray(dropdownOptions?.viaAdministracao)) {
          return dropdownOptions.viaAdministracao.map(via => ({
            value: via.idviaadministracao,
            label: via.Via_administracao
          }));
        }
        break;
      case 'ClasseFarmaceutica':
        if (Array.isArray(dropdownOptions?.classeFarmaceutica)) {
          return dropdownOptions.classeFarmaceutica.map(classe => ({
            value: classe.id_medicamento,
            label: classe.ClasseFarmaceutica
          }));
        }
        break;
      case 'Armazenamento':
        if (Array.isArray(dropdownOptions?.armazenamento)) {
          return dropdownOptions.armazenamento.map(arm => ({
            value: arm.idArmazenamento,
            label: arm.Armazenamento
          }));
        }
        break;
      case 'tipo_medicamento':
        if (Array.isArray(dropdownOptions?.tipoMedicamento)) {
          return dropdownOptions.tipoMedicamento.map(med => ({
            value: med.id_medicamento,
            label: med.tipo_medicamento
          }));
        }
        break;
      case 'FatorConversao':
        if (Array.isArray(dropdownOptions?.fatorConversao)) {
          return dropdownOptions.fatorConversao.map(fator => ({
            value: fator.id_fatorconversao,
            label: fator.fator
          }));
        }
        break;
      default:
        return [];
    }
    return [];
  };

  // Adaptador para handleNewDropdownChange
  const handleDropdownValueChange = (e, dropdownType, isNewRow) => {
    if (isNewRow) {
      // Cria um evento sintético para manter compatibilidade
      const event = { target: { value: e.target.value } };
      console.log(`Chamando handleNewDropdownChange para ${dropdownType} com valor ${e.target.value}`);
      handleNewDropdownChange(event, dropdownType);
      
      // Limpar campos de texto que devem ser apenas IDs no banco de dados
      if (dropdownType === 'UnidadeFracionamento') {
        // Garante que a visualização continue, mas o campo não seja enviado como string
        setTimeout(() => {
          // Remover o campo que está sendo enviado como string, mantendo apenas o ID
          if (newServiceData.UnidadeFracionamento) {
            const updatedData = {...newServiceData};
            delete updatedData.UnidadeFracionamento;
            // Aplicar somente se handleNewInputChange estiver disponível
            if (typeof handleNewInputChange === 'function') {
              handleNewInputChange({target: {value: ''}}, 'UnidadeFracionamento', true);
            }
          }
        }, 0);
      }
    } else {
      // Evento para edição
      const event = { target: { value: e.target.value } };
      handleDropdownChange(event, dropdownType);
    }
  };

  // Função para renderizar célula editável para campos de adição
  const renderEditableAddCell = (header, field, dropdownType = null) => {
    const isCurrentEditing = editingCell.rowId === 'new-row' && 
                             editingCell.columnId === field;
    
    // Verifica se este campo deve ser um dropdown
    const isDropdownField = [
      "Via_Administração", "Classe_Farmaceutica", "Princípio Ativo", 
      "Armazenamento", "Medicamento", "Unidade Fracionamento", 
      "Fator_Conversão", "Taxas", " Tabela "
    ].includes(header);
    
    // Preparar opções para dropdown
    let dropdownOpts = [];
    let actualDropdownType = dropdownType;
    
    if (isDropdownField) {
      if (!actualDropdownType) {
        switch(header) {
          case "Via_Administração": actualDropdownType = 'ViaAdministracao'; break;
          case "Classe_Farmaceutica": actualDropdownType = 'ClasseFarmaceutica'; break;
          case "Princípio Ativo": actualDropdownType = 'PrincipioAtivo'; break;
          case "Armazenamento": actualDropdownType = 'Armazenamento'; break;
          case "Medicamento": actualDropdownType = 'tipo_medicamento'; break;
          case "Unidade Fracionamento": actualDropdownType = 'UnidadeFracionamento'; break;
          case "Fator_Conversão": actualDropdownType = 'FatorConversao'; break;
          case "Taxas": actualDropdownType = 'Taxas'; break;
          case " Tabela ": actualDropdownType = 'Tabela'; break;
        }
      }
      
      dropdownOpts = getDropdownOptions(actualDropdownType);
    }
    
    // Determinar o valor atual para exibição
    const fieldId = {
      'PrincipioAtivo': 'idPrincipioAtivo',
      'UnidadeFracionamento': 'idUnidadeFracionamento',
      'Taxas': 'idTaxas',
      'Tabela': 'idTabela',
      'ViaAdministracao': 'idViaAdministracao',
      'ClasseFarmaceutica': 'idClasseFarmaceutica',
      'Armazenamento': 'idArmazenamento',
      'tipo_medicamento': 'idMedicamento',
      'FatorConversao': 'idFatorConversao',
    }[actualDropdownType];
    
    const cellValue = fieldId ? newServiceData[fieldId] : newServiceData[field];
    
    // Encontrar o label para o valor do dropdown
    const displayValue = isDropdownField && dropdownOpts.length > 0 ? 
      dropdownOpts.find(opt => String(opt.value) === String(cellValue))?.label || cellValue : 
      cellValue;
    
    if (isCurrentEditing) {
      return (
        <div className="editable-cell" onClick={(e) => e.stopPropagation()}>
          <MemoizedEditableCell
            value={cellValue || ''}
            rowId="new-row"
            columnId={field}
            onUpdate={handleCellUpdate}
            isDropdown={isDropdownField}
            dropdownType={actualDropdownType}
            dropdownOptions={dropdownOpts}
            onDropdownChange={handleDropdownValueChange}
            isNew={true}
          />
        </div>
      );
    }
    
    return (
      <div 
        className="editable-cell-trigger p-1 min-h-[30px] cursor-pointer flex items-center justify-center"
        style={{
          backgroundColor: '#f68484',
          color: '#f1f1f1',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          position: 'relative',
          paddingRight: isDropdownField ? '20px' : '8px'
        }}
        onClick={(e) => {
          e.stopPropagation();
          startEditing('new-row', field, cellValue, isDropdownField, actualDropdownType);
        }}
      >
        {displayValue || <span style={{color: '#f1f1f1'}}>Selecione...</span>}
        {isDropdownField && (
          <span style={{
            position: 'absolute',
            right: '8px',
            fontSize: '10px'
          }}>▼</span>
        )}
      </div>
    );
  };

  // Função para renderizar input para célula principal em modo de adição
  const renderAddMainCell = (header) => {
    // Para colunas expansíveis que precisam de selects
    if (expandableHeaders[header] && expansibleSelectColumns.includes(header)) {
      // Especial para Princípio Ativo
      if (header === "Princípio Ativo") {
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idPrincipioAtivo', 'PrincipioAtivo')}
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.PrincipioAtivo && (
              <div className="text-xs mt-1" style={{color: '#f1f1f1'}}>
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
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idUnidadeFracionamento', 'UnidadeFracionamento')}
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.UnidadeFracionamento && (
              <div className="text-xs mt-1" style={{color: '#f1f1f1'}}>
                Selecionado: {newServiceData.UnidadeFracionamentoDescricao || newServiceData.Descricao || newServiceData.UnidadeFracionamento}
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
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idTaxas', 'Taxas')}
            
            {/* Exibir valor selecionado abaixo do select */}
            {newServiceData.TaxaFinalidade && (
              <div className="text-xs mt-1" style={{color: '#f1f1f1'}}>
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
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idTabela', 'Tabela')}
            
            {/* Exibir valor selecionado abaixo do select com finalidade */}
            {newServiceData.tabela && (
              <div className="text-xs mt-1" style={{color: '#f1f1f1'}}>
                Selecionado: {newServiceData.finalidade 
                  ? `${newServiceData.tabela} + ${newServiceData.finalidade}` 
                  : newServiceData.tabela}
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
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={newServiceData[header] || ''}
            onChange={(e) => {
              e.stopPropagation();
              handleNewInputChange(e, header);
            }}
            onClick={(e) => e.stopPropagation()}
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
        return renderEditableAddCell(header, 'Cod');
      case "Código TUSS":
        return renderEditableAddCell(header, 'Codigo_TUSS');
      case "Via_Administração":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idViaAdministracao', 'ViaAdministracao')}
            {newServiceData.ViaAdministracao && (
              <div className="text-xs text-gray-200 mt-1">
                {newServiceData.ViaAdministracao}
              </div>
            )}
          </div>
        );
      case "Classe_Farmaceutica":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idClasseFarmaceutica', 'ClasseFarmaceutica')}
            {newServiceData.ClasseFarmaceutica && (
              <div className="text-xs text-gray-200 mt-1">
                {newServiceData.ClasseFarmaceutica}
              </div>
            )}
          </div>
        );
      case "Armazenamento":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idArmazenamento', 'Armazenamento')}
            {newServiceData.Armazenamento && (
              <div className="text-xs text-gray-200 mt-1">
                {newServiceData.Armazenamento}
              </div>
            )}
          </div>
        );
      case "Descricao_Apresentacao":
        return renderEditableAddCell(header, 'Descricao_Apresentacao');
      case "Descricao_Resumida":
        return renderEditableAddCell(header, 'Descricao_Resumida');
      case "Descricao_Comercial":
        return renderEditableAddCell(header, 'Descricao_Comercial');
      case "Medicamento":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idMedicamento', 'tipo_medicamento')}
            {newServiceData.tipo_medicamento && (
              <div className="text-xs text-gray-200 mt-1">
                {newServiceData.tipo_medicamento}
              </div>
            )}
          </div>
        );
      case "Fator_Conversão":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditableAddCell(header, 'idFatorConversao', 'FatorConversao')}
            {newServiceData.Fator_Conversão && (
              <div className="text-xs text-gray-200 mt-1">
                {newServiceData.Fator_Conversão}
              </div>
            )}
          </div>
        );
      case "Concentracao":
        return renderEditableAddCell(header, 'Concentracao');
      case "Fracionamento":
        return renderEditableAddCell(header, 'Fracionamento');
      case "Laboratorio":
        return renderEditableAddCell(header, 'Laboratorio');
      case "Revisado":
        return renderEditableAddCell(header, 'Revisado');
      default:
        // Para outros campos
        const fieldMapping = {
          "Concentracao": "Concentracao",
          "Fracionamento": "Fracionamento",
          "Laboratorio": "Laboratorio",
        };
        
        const field = fieldMapping[header] || header.replace(/ /g, '_');
        
        return renderEditableAddCell(header, field);
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
        (header === "Registro Visa" && newServiceData.RegistroVisa) ||
        (header === " Tabela " && newServiceData.idTabela)
      );
      
      const isCurrentEditing = editingCell.rowId === 'new-row' && 
                               editingCell.columnId === field;
      
      if (isCurrentEditing) {
        return (
          <>
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="relative editable-cell"
            >
              <MemoizedEditableCell
                value={newServiceData[field] || ''}
                rowId="new-row"
                columnId={field}
                onUpdate={handleCellUpdate}
                isDropdown={false}
                isNew={true}
              />
            </div>
            
            {/* Elemento completamente separado */}
            {wasAutoFilled && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="text-right py-1"
              >
                <span className="text-xs text-gray-200">Auto</span>
              </div>
            )}
          </>
        );
      }
      
      return (
        <div className="field-container" onClick={(e) => e.stopPropagation()}>
          <div 
            className={`p-1 min-h-[30px] cursor-pointer border rounded hover-disabled
                      ${wasAutoFilled ? 'auto-filled-field' : ''} 
                      ${isRequiredField ? 'border-red-500' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              startEditing('new-row', field, newServiceData[field] || '');
            }}
          >
            {newServiceData[field] || <span className="text-gray-400">{`${placeholder}${isRequiredField ? ' *' : ''}`}</span>}
          </div>
          
          {wasAutoFilled && (
            <div className="auto-indicator">
              <span>Auto</span>
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

  // Função para renderizar célula editável para campos de edição
  const renderEditableEditCell = (rowId, header, field, value, dropdownType = null) => {
    const isCurrentEditing = editingCell.rowId === rowId && 
                             editingCell.columnId === field;
    
    // Verifica se este campo deve ser um dropdown
    const isDropdownField = [
      "Via_Administração", "Classe_Farmaceutica", "Princípio Ativo", 
      "Armazenamento", "Medicamento", "Unidade Fracionamento", 
      "Fator_Conversão", "Taxas", " Tabela "
    ].includes(header);
    
    // Preparar opções para dropdown
    let dropdownOpts = [];
    let actualDropdownType = dropdownType;
    
    if (isDropdownField) {
      if (!actualDropdownType) {
        switch(header) {
          case "Via_Administração": actualDropdownType = 'ViaAdministracao'; break;
          case "Classe_Farmaceutica": actualDropdownType = 'ClasseFarmaceutica'; break;
          case "Princípio Ativo": actualDropdownType = 'PrincipioAtivo'; break;
          case "Armazenamento": actualDropdownType = 'Armazenamento'; break;
          case "Medicamento": actualDropdownType = 'tipo_medicamento'; break;
          case "Unidade Fracionamento": actualDropdownType = 'UnidadeFracionamento'; break;
          case "Fator_Conversão": actualDropdownType = 'FatorConversao'; break;
          case "Taxas": actualDropdownType = 'Taxas'; break;
          case " Tabela ": actualDropdownType = 'Tabela'; break;
        }
      }
      
      dropdownOpts = getDropdownOptions(actualDropdownType);
    }
    
    // Encontrar o label para o valor do dropdown
    const displayValue = isDropdownField && dropdownOpts.length > 0 ? 
      dropdownOpts.find(opt => String(opt.value) === String(value))?.label || value : 
      value;
    
    if (isCurrentEditing) {
      return (
        <div className="editable-cell" onClick={(e) => e.stopPropagation()}>
          <MemoizedEditableCell
            value={value || ''}
            rowId={rowId}
            columnId={field}
            onUpdate={handleCellUpdate}
            isDropdown={isDropdownField}
            dropdownType={actualDropdownType}
            dropdownOptions={dropdownOpts}
            onDropdownChange={handleDropdownValueChange}
            isNew={false}
          />
        </div>
      );
    }
    
    return (
      <div 
        className="editable-cell-trigger p-1 min-h-[30px] cursor-pointer flex items-center justify-center"
        style={{
          backgroundColor: '#f68484',
          color: '#f1f1f1',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          position: 'relative',
          paddingRight: isDropdownField ? '20px' : '8px'
        }}
        onClick={(e) => {
          e.stopPropagation();
          startEditing(rowId, field, value, isDropdownField, actualDropdownType);
        }}
      >
        {displayValue || <span style={{color: '#f1f1f1'}}>Selecione...</span>}
        {isDropdownField && (
          <span style={{
            position: 'absolute',
            right: '8px',
            fontSize: '10px'
          }}>▼</span>
        )}
      </div>
    );
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
        meta: { hidden: true }
      }),
      columnHelper.accessor('Cod', {
        header: () => renderSortableHeader('Cod'),
        cell: info => {
          // Linha de adição
          if (isAdding && info.row.index === 0) {
            return renderEditableAddCell('Cod', 'Cod');
          }
          
          // Linha normal em modo de edição
          const rowId = info.row.original.id;
          const isEditing = editingRow === rowId;
          
          if (isEditing) {
            return renderEditableEditCell(rowId, 'Cod', 'Cod', editedData.Cod);
          }
          
          return info.getValue();
        },
        size: 100,
        frozen: true,
      }),
      columnHelper.accessor('codigoTUSS', {
        header: () => renderSortableHeader('Código TUSS'),
        cell: info => {
          // Linha de adição
          if (isAdding && info.row.index === 0) {
            return renderEditableAddCell('Código TUSS', 'Codigo_TUSS');
          }
          
          // Linha normal em modo de edição
          const rowId = info.row.original.id;
          const isEditing = editingRow === rowId;
          
          if (isEditing) {
            return renderEditableEditCell(rowId, 'Código TUSS', 'codigoTUSS', editedData.codigoTUSS);
          }
          
          return info.getValue();
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
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderEditableEditCell(
                          rowId, 
                          header, 
                          'idPrincipioAtivo', 
                          editedData.idPrincipioAtivo || '', 
                          'PrincipioAtivo'
                        )}
                        {editedData.Principio_Ativo && !expandedHeaders.has(header) && (
                          <div className="modified-indicator">
                            Modificado: {editedData.Principio_Ativo}
                          </div>
                        )}
                      </div>
                    );
                    
                  case "Unidade Fracionamento":
                    return (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderEditableEditCell(
                          rowId, 
                          header, 
                          'idUnidadeFracionamento', 
                          editedData.idUnidadeFracionamento || '', 
                          'UnidadeFracionamento'
                        )}
                        {editedData.Unidade_Fracionamento && !expandedHeaders.has(header) && (
                          <div className="text-xs text-gray-200 mt-1">
                            Modificado: {editedData.UnidadeFracionamentoDescricao || editedData.Unidade_Fracionamento}
                          </div>
                        )}
                      </div>
                    );
                  
                  case "Taxas":
                    return (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderEditableEditCell(
                          rowId, 
                          header, 
                          'idTaxas', 
                          editedData.idTaxas || '', 
                          'Taxas'
                        )}
                        {editedData.finalidade && !expandedHeaders.has(header) && (
                          <div className="text-xs text-gray-200 mt-1">
                            Modificado: {editedData.finalidade}
                          </div>
                        )}
                      </div>
                    );

                  case " Tabela ":
                    return (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderEditableEditCell(
                          rowId, 
                          header, 
                          'idTabela', 
                          editedData.idTabela || '', 
                          'Tabela'
                        )}
                        {editedData.tabela && !expandedHeaders.has(header) && (
                          <div className="text-xs text-gray-200 mt-1">
                            Modificado: {editedData.tabela}
                          </div>
                        )}
                      </div>
                    );
                  
                  default:
                    return renderEditableEditCell(rowId, header, header, editedData[header]);
                }
              } else {
                // Para outras colunas expansíveis em modo de edição
                return renderEditableEditCell(rowId, header, header, editedData[header]);
              }
            } else {
              // Modo de visualização normal
              return (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpansion(info.row.id, e);
                  }} 
                  className="cursor-pointer"
                >
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
                   (header === "Taxas" && editedData.idTaxas) ||
                   (header === " Tabela " && editedData.idTabela));
                
                if (isEditing) {
                  const isCurrentEditing = editingCell.rowId === rowId && 
                                          editingCell.columnId === sub;
                  
                  if (isCurrentEditing) {
                    return (
                      <div className="relative editable-cell" onClick={(e) => e.stopPropagation()}>
                        <MemoizedEditableCell
                          value={editedData[sub] || ''}
                          rowId={rowId}
                          columnId={sub}
                          onUpdate={handleCellUpdate}
                          isDropdown={false}
                          isNew={false}
                        />
                        {wasAutoFilled && (
                          <div className="auto-indicator">
                            <span>Auto</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <div className="field-container">
                        <div 
                          className={`p-1 min-h-[30px] cursor-pointer border rounded hover-disabled ${wasAutoFilled ? 'auto-filled-field' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(rowId, sub, editedData[sub] || '');
                          }}
                        >
                          {editedData[sub] || <span></span>}
                        </div>
                        {wasAutoFilled && (
                          <div className="auto-indicator">
                            <span>Auto</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return info.getValue();
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
                    <div onClick={(e) => e.stopPropagation()}>
                      {renderEditableEditCell(
                        rowId, 
                        header, 
                        'idViaAdministracao', 
                        editedData.idViaAdministracao || '', 
                        'ViaAdministracao'
                      )}
                      {editedData.Via_Administração && (
                        <div className="text-xs text-gray-200 mt-1">
                          {editedData.Via_Administração}
                        </div>
                      )}
                    </div>
                  );
                  
                case "Classe_Farmaceutica":
                  return (
                    <div onClick={(e) => e.stopPropagation()}>
                      {renderEditableEditCell(
                        rowId, 
                        header, 
                        'idClasseFarmaceutica', 
                        editedData.idClasseFarmaceutica || '', 
                        'ClasseFarmaceutica'
                      )}
                      {editedData.Classe_Farmaceutica && (
                        <div className="text-xs text-gray-200 mt-1">
                          {editedData.Classe_Farmaceutica}
                        </div>
                      )}
                    </div>
                  );
                
                default:
                  return renderEditableEditCell(
                    rowId, 
                    header, 
                    header.replace(/ /g, '_'), 
                    editedData[header.replace(/ /g, '_')]
                  );
              }
            } else if (isEditing) {
              return renderEditableEditCell(
                rowId, 
                header, 
                header.replace(/ /g, '_'), 
                editedData[header.replace(/ /g, '_')]
              );
            } else {
              return info.getValue();
            }
          },
        });
      }
    });

    return cols;
  }, [expandedHeaders, expandedRows, editingRow, editedData, handleInputChange, handleDropdownChange, 
      dropdownOptions, isAdding, newServiceData, sortField, sortOrder, editingCell]);

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
      <style jsx>{`
        .editable-cell {
          position: relative;
          height: 100%;
        }
        .editable-cell input,
        .editable-cell select {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
        }
        .editable-cell-trigger {
          min-height: 30px;
        }
        .expanded-header-cell {
          color: #35524a !important;
          
          
        }
        .expanded-subcolumn-cell {
          
          background: linear-gradient(360deg, #f7c59f 10%, #e4a94f 100%);
        }
      `}</style>
      <table className="table-auto w-full data-table border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers
                // Filtrar colunas ocultas
                .filter(header => !(header.column.columnDef.meta?.hidden))
                .map(header => {
                  // Extrair o nome da coluna do ID (remove prefixos como "accessorKey_")
                  const columnId = header.column.id;
                  const columnName = columnId.includes('_') 
                    ? columnId.split('_').pop() 
                    : columnId;
                  
                  // Verificar se é um cabeçalho expansível
                  const isExpandableHeader = Object.keys(expandableHeaders).includes(columnName);
                  const isExpanded = isExpandableHeader && expandedHeaders.has(columnName);
                  
                  // Verificar se é uma subcoluna de um cabeçalho expandido
                  const isSubColumn = isSubcolumnOfExpandedHeader(columnName);
                  
                  // Determinar a classe do cabeçalho
                  let thClassName = "border px-4 py-2 text-center";
                  if (isExpanded) {
                    thClassName += " expanded-header-cell";
                  } else if (isSubColumn) {
                    thClassName += " expanded-subcolumn-cell";
                  }
                  
                  return (
                    <th
                      key={header.id}
                      className={thClassName}
                      style={{ 
                        width: header.column.columnDef.size, 
                        minWidth: header.column.columnDef.size 
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => {
            // Para cada linha
            // Verificar se é a linha de adição (primeira linha quando isAdding=true)
            if (isAdding && row.original.id === 'add-new-row') {
              return (
                <tr key={row.id} className="adding-row">
                  {row.getVisibleCells()
                    // Filtrar células ocultas
                    .filter(cell => !(cell.column.columnDef.meta?.hidden))
                    .map(cell => (
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
                onClick={(e) => handleRowClick(rowId, e)}
                className={`cursor-pointer-aqui ${isSelected ? '' : 'hover:bg-gray-300'}`}
                style={{
                  backgroundColor: isSelected ? '#f26b6b' : undefined,
                  color: isSelected ? '#f1f1f1' : undefined
                }}
              >
                {row.getVisibleCells()
                  // Filtrar células ocultas
                  .filter(cell => !(cell.column.columnDef.meta?.hidden))
                  .map(cell => (
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