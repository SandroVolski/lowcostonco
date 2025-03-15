import React, { useState, useMemo, useEffect, useRef } from "react";
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import { DataTable } from '../../components/DataTable';
import PageTransition from "../../components/PageTransition";
import { useServiceData } from '../../components/ServiceContext'; // Importe o contexto
import { DropdownOptionsProvider, useDropdownOptions } from '../../components/DropdownOptionsContext';

import '../../App.css';
import './ServicoRelacionada.css';
import '../../utils/CustomAlerts.css'; // Importar CSS dos alertas personalizados

import { Search, Plus, Trash2, Edit, RefreshCw, X, Save, ArrowUpDown, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import { 
  showSuccessAlert, 
  showErrorAlert, 
  showWarningAlert, 
  showInfoAlert, 
  showConfirmAlert,
  showSuccessPopup 
} from '../../utils/CustomAlerts'; // Importar funções de alerta personalizadas

export default function ServicoRelacionada() {
  // Componente principal que inclui o Provider
  return (
    <DropdownOptionsProvider>
      <ServicoRelacionadaContent />
    </DropdownOptionsProvider>
  );
}

function ServicoRelacionadaContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Referência para o componente DataTable para controlar expansão de colunas
  const dataTableRef = useRef(null);

  const resetNewServiceData = () => {
    return {
      Cod: '',
      Codigo_TUSS: '',
      Descricao_Apresentacao: '',
      Descricao_Resumida: '',
      Descricao_Comercial: '',
      Concentracao: '',
      Fracionamento: '',
      Laboratorio: '',
      Revisado: 0,
      
      // Campos de RegistroVisa
      RegistroVisa: '',
      Cod_Ggrem: '',
      Principio_Ativo: '',
      Lab: '',
      cnpj_lab: '',
      Classe_Terapeutica: '',
      Tipo_Porduto: '',
      Regime_Preco: '',
      Restricao_Hosp: '',
      Cap: '',
      Confaz87: '',
      Icms0: '',
      Lista: '',
      Status: '',
      
      // Campos de Tabela
      tabela: '',
      tabela_classe: '',
      tabela_tipo: '',
      classe_Jaragua_do_sul: '',
      classificacao_tipo: '',
      finalidade: '',
      objetivo: '',
      
      // Novos campos para armazenar os IDs
      idRegistroVisa: null,
      idViaAdministracao: null,
      idClasseFarmaceutica: null,
      idPrincipioAtivo: null,
      idArmazenamento: null,
      idMedicamento: null,
      idUnidadeFracionamento: null,
      idFatorConversao: null,
      idTaxas: null,
      idTabela: null,
  
      // Outros campos
      Via_administracao: '',
      ViaAdministracao: '',
      ClasseFarmaceutica: '',
      PrincipioAtivo: '',
      PrincipioAtivoClassificado: '',
      FaseUGF: '',
      Armazenamento: '',
      tipo_medicamento: '',
      
      // Unidade de Fracionamento
      UnidadeFracionamento: '',
      Unidade_Fracionamento: '',
      UnidadeFracionamentoDescricao: '',
      Descricao: '',
      Divisor: '',
      
      // Taxas
      tipo_taxa: '',
      TaxaFinalidade: '',
      tempo_infusao: ''
    };
  };

  const [newServiceData, setNewServiceData] = useState(resetNewServiceData());

  // Adicione este useEffect ao seu componente ServicoRelacionadaContent
  useEffect(() => {
    if (isAdding) {
      console.log('=== ESTADO DE newServiceData ATUALIZADO ===');
      console.log('Cod:', newServiceData.Cod);
      console.log('RegistroVisa:', newServiceData.RegistroVisa);
      console.log('idRegistroVisa:', newServiceData.idRegistroVisa);
      console.log('idViaAdministracao:', newServiceData.idViaAdministracao, 'tipo:', typeof newServiceData.idViaAdministracao);
      console.log('ViaAdministracao:', newServiceData.ViaAdministracao);
      console.log('idClasseFarmaceutica:', newServiceData.idClasseFarmaceutica);
      console.log('ClasseFarmaceutica:', newServiceData.ClasseFarmaceutica);
      console.log('idPrincipioAtivo:', newServiceData.idPrincipioAtivo);
      console.log('PrincipioAtivo:', newServiceData.PrincipioAtivo);
      console.log('idArmazenamento:', newServiceData.idArmazenamento);
      console.log('Armazenamento:', newServiceData.Armazenamento);
      console.log('idMedicamento:', newServiceData.idMedicamento);
      console.log('tipo_medicamento:', newServiceData.tipo_medicamento);
      console.log('idUnidadeFracionamento:', newServiceData.idUnidadeFracionamento);
      console.log('UnidadeFracionamento:', newServiceData.UnidadeFracionamento);
      console.log('idFatorConversao:', newServiceData.idFatorConversao);
      console.log('Fator_Conversão:', newServiceData.Fator_Conversão);
      console.log('idTaxas:', newServiceData.idTaxas);
      console.log('TaxaFinalidade:', newServiceData.TaxaFinalidade);
      console.log('============================================');
    }
  }, [newServiceData, isAdding, updateCounter]);

  // Usando o contexto de serviços com as propriedades de ordenação
  const { 
    serviceData, 
    loading, 
    error, 
    hasMore, 
    sortOrder, 
    sortField,
    setSortOrder,
    setSortField,
    changeSort,
    loadMore,
    updateService,
    deleteService,
    loadServiceData,
    initialized,
    addService
  } = useServiceData();

  const { dropdownOptions } = useDropdownOptions();
  
  useEffect(() => {
    // Somente carrega os dados automaticamente se não estiverem inicializados
    if (!initialized && !loading && serviceData.length === 0) {
      loadServiceData(1, true);
    }
  }, [initialized, loading, serviceData.length, loadServiceData]);

  // Função para alternar a seleção de uma linha
  const toggleRowSelection = (rowId) => {
    if (isEditing) return; // Não permite desselecionar durante a edição

    const adjustedRowId = Number(rowId);
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adjustedRowId)) {
        newSet.delete(adjustedRowId);
      } else {
        newSet.clear();
        newSet.add(adjustedRowId);
      }
      console.log("Linha selecionada:", adjustedRowId);
      return newSet;
    });
  };

  const handleLoadData = () => {
    loadServiceData(1, true);
  };

  // Função para excluir um serviço
  const handleDelete = async () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) return;

    // Confirmar exclusão com o usuário
    const confirmResult = await showConfirmAlert(
      "Tem certeza que deseja excluir este serviço?", 
      "Esta ação não pode ser desfeita."
    );
    
    if (!confirmResult) return; // Usuário cancelou a exclusão

    try {
      setLocalLoading(true);
      
      const response = await fetch(`http://localhost/backend-php/api/delete_service.php?id=${selectedRowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir o serviço");
      }

      // Atualiza o estado global
      deleteService(selectedRowId);
      
      // Limpa a seleção
      setSelectedRows(new Set());

      // Mostrar alerta de sucesso
      showSuccessAlert("Serviço excluído com sucesso!");
      console.log("Serviço excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir o serviço:", error);
      showErrorAlert("Falha ao excluir", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // Função para habilitar a edição de uma linha
  const handleEdit = () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) {
      showWarningAlert("Selecione um serviço", "Você precisa selecionar um serviço para editar.");
      return;
    }
  
    const rowToEdit = serviceData.find(item => item.id === selectedRowId);
    if (!rowToEdit) {
      showErrorAlert("Serviço não encontrado", "O serviço selecionado não foi encontrado.");
      return;
    }
  
    console.log("Dados originais para edição:", rowToEdit);
    setEditingRow(selectedRowId);
    setEditedData(rowToEdit);
    setIsEditing(true);
  };
  
  const handleCancel = async () => {
    // Se estiver editando, confirmar com o usuário antes de cancelar
    if (isEditing) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a edição?", 
        "Todas as alterações feitas serão perdidas."
      );
      
      if (!confirmCancel) {
        return; // Usuário não quer cancelar a edição
      }
    }
    
    setEditingRow(null);
    setEditedData({});
    setIsEditing(false);
  };

  // Função modificada para colapsar cabeçalhos expandidos antes de adicionar
  const handleAdd = () => {
    // First collapse all expanded headers if any
    if (dataTableRef.current && typeof dataTableRef.current.collapseAllHeaders === 'function') {
      dataTableRef.current.collapseAllHeaders();
      console.log("Colapsando todas as seções expandidas antes de adicionar");
    }
    
    setIsAdding(true);
    setNewServiceData(resetNewServiceData());
    setSelectedRows(new Set()); // Limpa qualquer seleção existente
  };

  const handleCancelAdd = async () => {
    // Verificar se há campos preenchidos antes de cancelar
    const hasData = Object.entries(newServiceData).some(([key, value]) => {
      // Ignorar campos que começam com "id" e verificar se campos de texto têm conteúdo
      return !key.startsWith('id') && 
             typeof value === 'string' && 
             value.trim() !== '' && 
             key !== 'Revisado';
    });
    
    setIsAdding(false);
    setNewServiceData(resetNewServiceData());
  };

  const handleSaveNew = async () => {
    // Validação básica
    if (!newServiceData.Cod) {
      showWarningAlert("Campo obrigatório", "Por favor, preencha o Código.");
      return;
    }

    // Verificar se há campos de RegistroVisa preenchidos sem o RegistroVisa principal
    const hasRegistroVisaFields = [
      'Cod_Ggrem', 'Lab', 'cnpj_lab', 'Classe_Terapeutica', 
      'Tipo_Porduto', 'Regime_Preco', 'Restricao_Hosp', 'Cap', 
      'Confaz87', 'Icms0', 'Lista', 'Status', 'Principio_Ativo'
    ].some(field => newServiceData[field] && newServiceData[field].trim() !== '');
    
    // Se tem algum campo de RegistroVisa preenchido mas não tem o campo RegistroVisa
    if (hasRegistroVisaFields && (!newServiceData.RegistroVisa || newServiceData.RegistroVisa.trim() === '')) {
      showWarningAlert(
        "Campo obrigatório", 
        "Você preencheu campos do Registro Visa, mas o campo 'RegistroVisa' é obrigatório."
      );
      
      // Destacar o campo RegistroVisa expandindo o cabeçalho, se necessário
      if (dataTableRef.current && typeof dataTableRef.current.expandHeader === 'function') {
        dataTableRef.current.expandHeader("Registro Visa");
      }
      
      return;
    }
    
    // Criar uma cópia dos dados para poder modificá-los
    const dataToSend = { ...newServiceData };
    

    // ADICIONAR ESTES LOGS PARA DEBUGGING
    console.group('DADOS ORIGINAIS ANTES DE FILTRAR:');
    console.log('idUnidadeFracionamento:', dataToSend.idUnidadeFracionamento);
    console.log('UnidadeFracionamento:', dataToSend.UnidadeFracionamento);
    console.log('Unidade_Fracionamento:', dataToSend.Unidade_Fracionamento);
    console.log('UnidadeFracionamentoDescricao:', dataToSend.UnidadeFracionamentoDescricao);
    console.log('Descricao:', dataToSend.Descricao);
    console.log('Divisor:', dataToSend.Divisor);
    console.groupEnd();

    // Remover campos que podem causar conflitos de tipo
    // Estes campos de texto não devem ser enviados quando já temos os IDs
    if (!dataToSend.UnidadeFracionamentoDescricao && dataToSend.Descricao) {
      dataToSend.UnidadeFracionamentoDescricao = dataToSend.Descricao;
    } else if (dataToSend.UnidadeFracionamentoDescricao && !dataToSend.Descricao) {
      dataToSend.Descricao = dataToSend.UnidadeFracionamentoDescricao;
    }
    
    if (dataToSend.idPrincipioAtivo) {
      delete dataToSend.PrincipioAtivo;
      delete dataToSend.Principio_Ativo;
    }
    
    if (dataToSend.idViaAdministracao) {
      delete dataToSend.ViaAdministracao;
      delete dataToSend.Via_Administração;
      delete dataToSend.Via_administracao;
    }
    
    if (dataToSend.idClasseFarmaceutica) {
      delete dataToSend.ClasseFarmaceutica;
      delete dataToSend.Classe_Farmaceutica;
    }
    
    if (dataToSend.idTaxas) {
      delete dataToSend.TaxaFinalidade;
      delete dataToSend.finalidade;
      delete dataToSend["tipo taxa"];
      delete dataToSend.tipo_taxa;
      delete dataToSend["Tempo infusão"];
      delete dataToSend.tempo_infusao;
    }
    
    if (dataToSend.idMedicamento) {
      delete dataToSend.tipo_medicamento;
      delete dataToSend.Medicamento;
    }
    
    if (dataToSend.idFatorConversao) {
      delete dataToSend.Fator_Conversão;
      delete dataToSend.fator;
    }
    
    console.group('DADOS A SEREM SALVOS (LIMPOS):');
    console.log('Dados filtrados a serem enviados:', dataToSend);
    console.groupEnd();
  
    try {
      // Mostrar indicador de carregamento
      setLocalLoading(true);
      
      console.log("Dados a serem enviados:", JSON.stringify(dataToSend));
      const serviceId = await addService(dataToSend);
      
      setIsAdding(false);
      handleCancelAdd();
      
      // Feedback de sucesso
      showSuccessPopup({ id: serviceId, cod: dataToSend.Cod }, false, 5000);  
      console.log("Serviço adicionado com sucesso!", serviceId);
      
      // Em vez de chamar resetAndLoad, use as funções que já existem no contexto
      if (typeof loadServiceData === 'function') {
        loadServiceData(1, true);
      }
      
    } catch (error) {
      console.error("Erro ao adicionar o serviço:", error);
      showErrorAlert(
        "Falha ao adicionar serviço", 
        error.message || "Erro desconhecido"
      );
    } finally {
      setLocalLoading(false);
    }
  };

  // CORRECTEDFUNCTION: Função para capturar as alterações nos campos do novo serviço - CORRIGIDA
  const handleNewInputChange = (e, field) => {
    const { value } = e.target;
    
    // IMPORTANTE: Use a sintaxe de função para garantir o estado mais atualizado
    setNewServiceData(prevData => ({
      ...prevData,
      [field]: value // Armazena o valor completo do input, não apenas o último caractere
    }));
  };
  
  // CORRECTEDFUNCTION: Função para capturar as alterações nos campos editáveis

  // CORRECTEDFUNCTION: Função para capturar as alterações nos campos editáveis - CORRIGIDA
  const handleInputChange = (e, field) => {
    const { value } = e.target;
    
    // Use a sintaxe de função para garantir o estado mais atualizado
    setEditedData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  // CORRECTEDFUNCTION: Função handleNewDropdownChange corrigida
  const handleNewDropdownChange = (e, field) => {
    const value = e.target.value;
    const selectedId = value ? parseInt(value, 10) : null;
    
    console.log(`Dropdown ${field} mudou para ${value}`);
    
    // Crie uma cópia do estado atual para fazer modificações
    const updatedData = { ...newServiceData };
    
    // Dependendo do campo, atualize diferentes campos relacionados
    switch(field) {
      case 'PrincipioAtivo':
        if (value) {
          // Encontrar o objeto do princípio ativo selecionado
          const selectedPrincipio = dropdownOptions.principioAtivo.find(
            p => String(p.idPrincipioAtivo) === String(value)
          );
          
          if (selectedPrincipio) {
            console.log("Princípio ativo encontrado:", selectedPrincipio);
            
            // Atualizar ID
            updatedData.idPrincipioAtivo = selectedId;
            
            // Preencher campos relacionados
            updatedData.PrincipioAtivo = selectedPrincipio.PrincipioAtivo;
            updatedData.Principio_Ativo = selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivoClassificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.FaseUGF = selectedPrincipio.FaseUGF || '';
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idPrincipioAtivo = null;
          updatedData.PrincipioAtivo = '';
          updatedData.Principio_Ativo = '';
          updatedData.PrincipioAtivoClassificado = '';
          updatedData.FaseUGF = '';
        }
        break;
        
        case 'UnidadeFracionamento':
          if (value) {
            const selectedUnidade = dropdownOptions.unidadeFracionamento.find(
              u => String(u.id_unidadefracionamento) === String(value)
            );
            
            if (selectedUnidade) {
              console.log("Unidade de fracionamento encontrada:", selectedUnidade);
              
              // Atualizar ID
              updatedData.idUnidadeFracionamento = selectedId;
              
              // IMPORTANTE: Preencher todos os campos relacionados corretamente
              updatedData.UnidadeFracionamento = selectedUnidade.UnidadeFracionamento;
              updatedData.Unidade_Fracionamento = selectedUnidade.UnidadeFracionamento;
              updatedData.UnidadeFracionamentoDescricao = selectedUnidade.Descricao || '';
              updatedData.Descricao = selectedUnidade.Descricao || '';
              updatedData.Divisor = selectedUnidade.Divisor || '';
              
              // Log detalhado para debugging
              console.group("Campos de UnidadeFracionamento atualizados:");
              console.log("  idUnidadeFracionamento:", updatedData.idUnidadeFracionamento);
              console.log("  UnidadeFracionamento:", updatedData.UnidadeFracionamento);
              console.log("  Unidade_Fracionamento:", updatedData.Unidade_Fracionamento);
              console.log("  UnidadeFracionamentoDescricao:", updatedData.UnidadeFracionamentoDescricao);
              console.log("  Descricao:", updatedData.Descricao);
              console.log("  Divisor:", updatedData.Divisor);
              console.groupEnd();
            }
          } else {
            // Limpar campos se não houver seleção
            updatedData.idUnidadeFracionamento = null;
            updatedData.UnidadeFracionamento = '';
            updatedData.Unidade_Fracionamento = '';
            updatedData.UnidadeFracionamentoDescricao = '';
            updatedData.Descricao = '';
            updatedData.Divisor = '';
          }
          break;
        
      case 'Taxas':
        if (value) {
          const selectedTaxa = dropdownOptions.taxas.find(
            t => String(t.id_taxas) === String(value)
          );
          
          if (selectedTaxa) {
            console.log("Taxa encontrada:", selectedTaxa);
            
            // Atualizar ID
            updatedData.idTaxas = selectedId;
            
            // Preencher campos relacionados
            updatedData.TaxaFinalidade = selectedTaxa.finalidade;
            updatedData.finalidade = selectedTaxa.finalidade;
            updatedData.tipo_taxa = selectedTaxa.tipo_taxa || '';
            updatedData["tipo taxa"] = selectedTaxa.tipo_taxa || '';
            updatedData.tempo_infusao = selectedTaxa.tempo_infusao || '';
            updatedData["Tempo infusão"] = selectedTaxa.tempo_infusao || '';
            updatedData.id_taxa = selectedTaxa.id_taxas;
            updatedData["ID Taxa"] = selectedTaxa.id_taxas;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idTaxas = null;
          updatedData.TaxaFinalidade = '';
          updatedData.finalidade = '';
          updatedData.tipo_taxa = '';
          updatedData["tipo taxa"] = '';
          updatedData.tempo_infusao = '';
          updatedData["Tempo infusão"] = '';
          updatedData.id_taxa = '';
          updatedData["ID Taxa"] = '';
        }
        break;
        
      case 'ViaAdministracao':
        if (value) {
          const selectedVia = dropdownOptions.viaAdministracao.find(
            v => String(v.idviaadministracao) === String(value)
          );
          
          if (selectedVia) {
            console.log("Via de administração encontrada:", selectedVia);
            
            // Atualizar ID
            updatedData.idViaAdministracao = selectedId;
            
            // Preencher campos relacionados
            updatedData.ViaAdministracao = selectedVia.Via_administracao;
            updatedData.Via_Administração = selectedVia.Via_administracao;
            updatedData.Via_administracao = selectedVia.Via_administracao;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idViaAdministracao = null;
          updatedData.ViaAdministracao = '';
          updatedData.Via_Administração = '';
          updatedData.Via_administracao = '';
        }
        break;
        
      case 'ClasseFarmaceutica':
        if (value) {
          const selectedClasse = dropdownOptions.classeFarmaceutica.find(
            c => String(c.id_medicamento) === String(value)
          );
          
          if (selectedClasse) {
            console.log("Classe farmacêutica encontrada:", selectedClasse);
            
            // Atualizar ID
            updatedData.idClasseFarmaceutica = selectedId;
            
            // Preencher campos relacionados
            updatedData.ClasseFarmaceutica = selectedClasse.ClasseFarmaceutica;
            updatedData.Classe_Farmaceutica = selectedClasse.ClasseFarmaceutica;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idClasseFarmaceutica = null;
          updatedData.ClasseFarmaceutica = '';
          updatedData.Classe_Farmaceutica = '';
        }
        break;
        
      case 'Armazenamento':
        if (value) {
          const selectedArm = dropdownOptions.armazenamento.find(
            a => String(a.idArmazenamento) === String(value)
          );
          
          if (selectedArm) {
            console.log("Armazenamento encontrado:", selectedArm);
            
            // Atualizar ID
            updatedData.idArmazenamento = selectedId;
            
            // Preencher campos relacionados
            updatedData.Armazenamento = selectedArm.Armazenamento;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idArmazenamento = null;
          updatedData.Armazenamento = '';
        }
        break;
        
      case 'tipo_medicamento':
        if (value) {
          const selectedMed = dropdownOptions.tipoMedicamento.find(
            m => String(m.id_medicamento) === String(value)
          );
          
          if (selectedMed) {
            console.log("Medicamento encontrado:", selectedMed);
            
            // Atualizar ID
            updatedData.idMedicamento = selectedId;
            
            // Preencher campos relacionados
            updatedData.tipo_medicamento = selectedMed.tipo_medicamento;
            updatedData.Medicamento = selectedMed.tipo_medicamento;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idMedicamento = null;
          updatedData.tipo_medicamento = '';
          updatedData.Medicamento = '';
        }
        break;
        
      case 'FatorConversao':
        if (value) {
          const selectedFator = dropdownOptions.fatorConversao.find(
            f => String(f.id_fatorconversao) === String(value)
          );
          
          if (selectedFator) {
            console.log("Fator de conversão encontrado:", selectedFator);
            
            // Atualizar ID
            updatedData.idFatorConversao = selectedId;
            
            // Preencher campos relacionados
            updatedData.Fator_Conversão = selectedFator.fator;
            updatedData.fator = selectedFator.fator;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idFatorConversao = null;
          updatedData.Fator_Conversão = '';
          updatedData.fator = '';
        }
        break;

        case 'Tabela':
          if (value) {
            // Encontrar o objeto da tabela selecionada
            const selectedTabela = dropdownOptions.tabela.find(
              t => String(t.id_tabela) === String(value)
            );
            
            if (selectedTabela) {
              console.log("Tabela encontrada:", selectedTabela);
              
              // Atualizar ID
              updatedData.idTabela = selectedId;
              
              // Preencher campos relacionados
              updatedData.tabela = selectedTabela.tabela;
              updatedData.tabela_classe = selectedTabela.tabela_classe || '';
              updatedData.tabela_tipo = selectedTabela.tabela_tipo || '';
              updatedData.classe_Jaragua_do_sul = selectedTabela.classe_Jaragua_do_sul || '';
              updatedData.classificacao_tipo = selectedTabela.classificacao_tipo || '';
              updatedData.finalidade = selectedTabela.finalidade || '';
              updatedData.objetivo = selectedTabela.objetivo || '';
            }
          } else {
            // Limpar campos se não houver seleção
            updatedData.idTabela = null;
            updatedData.tabela = '';
            updatedData.tabela_classe = '';
            updatedData.tabela_tipo = '';
            updatedData.classe_Jaragua_do_sul = '';
            updatedData.classificacao_tipo = '';
            updatedData.finalidade = '';
            updatedData.objetivo = '';
          }
          break;
        
      default:
        console.error(`Campo não reconhecido: ${field}`);
    }
    
    // Atualizar o estado com os novos dados
    setNewServiceData(updatedData);
    
    // IMPORTANTE: Forçar atualização com o trigger
    setUpdateCounter(prev => prev + 1);
    
    console.log("Estado atualizado para:", updatedData);
  };

  // Função para lidar com alterações nos dropdowns durante a edição
  // Substitua a função handleDropdownChange atual por esta versão completa
  const handleDropdownChange = (e, field) => {
    const value = e.target.value;
    const selectedId = value ? parseInt(value, 10) : null;
    
    console.log(`Edit dropdown changed: ${field}, selectedId: ${selectedId}`);
    
    // Similar ao handleNewDropdownChange, mas para o modo de edição
    const updatedData = { ...editedData };
    
    switch(field) {
      case 'ViaAdministracao':
        if (value) {
          const selectedVia = dropdownOptions.viaAdministracao.find(
            v => String(v.idviaadministracao) === String(value)
          );
          
          if (selectedVia) {
            console.log('Found matching Via for edit:', selectedVia);
            
            updatedData.idViaAdministracao = selectedId;
            updatedData.Via_Administração = selectedVia.Via_administracao;
            updatedData.ViaAdministracao = selectedVia.Via_administracao;
            updatedData.Via_administracao = selectedVia.Via_administracao;
          }
        } else {
          updatedData.idViaAdministracao = null;
          updatedData.Via_Administração = '';
          updatedData.ViaAdministracao = '';
          updatedData.Via_administracao = '';
        }
        break;
        
      case 'ClasseFarmaceutica':
        if (value) {
          const selectedClasse = dropdownOptions.classeFarmaceutica.find(
            c => String(c.id_medicamento) === String(value)
          );
          
          if (selectedClasse) {
            updatedData.idClasseFarmaceutica = selectedId;
            updatedData.Classe_Farmaceutica = selectedClasse.ClasseFarmaceutica;
            updatedData.ClasseFarmaceutica = selectedClasse.ClasseFarmaceutica;
          }
        } else {
          updatedData.idClasseFarmaceutica = null;
          updatedData.Classe_Farmaceutica = '';
          updatedData.ClasseFarmaceutica = '';
        }
        break;
        
      case 'PrincipioAtivo':
        if (value) {
          const selectedPrincipio = dropdownOptions.principioAtivo.find(
            p => String(p.idPrincipioAtivo) === String(value)
          );
          
          if (selectedPrincipio) {
            updatedData.idPrincipioAtivo = selectedId;
            updatedData["Princípio Ativo"] = selectedPrincipio.PrincipioAtivo;
            updatedData.Principio_Ativo = selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivo = selectedPrincipio.PrincipioAtivo;
            updatedData.Princípio_Ativo_Classificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivoClassificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.FaseuGF = selectedPrincipio.FaseUGF || '';
            updatedData.FaseUGF = selectedPrincipio.FaseUGF || '';
          }
        } else {
          updatedData.idPrincipioAtivo = null;
          updatedData["Princípio Ativo"] = '';
          updatedData.Principio_Ativo = '';
          updatedData.PrincipioAtivo = '';
          updatedData.Princípio_Ativo_Classificado = '';
          updatedData.PrincipioAtivoClassificado = '';
          updatedData.FaseuGF = '';
          updatedData.FaseUGF = '';
        }
        break;

      case 'UnidadeFracionamento':
        if (value) {
          const selectedUnidade = dropdownOptions.unidadeFracionamento.find(
            u => String(u.id_unidadefracionamento) === String(value)
          );
          
          if (selectedUnidade) {
            console.log('Found matching Unidade for edit:', selectedUnidade);
            
            updatedData.idUnidadeFracionamento = selectedId;
            updatedData.UnidadeFracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.Unidade_Fracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.UnidadeFracionamentoDescricao = selectedUnidade.Descricao || '';
            updatedData.Descricao = selectedUnidade.Descricao || '';
            updatedData.Divisor = selectedUnidade.Divisor || '';
          }
        } else {
          updatedData.idUnidadeFracionamento = null;
          updatedData.UnidadeFracionamento = '';
          updatedData.Unidade_Fracionamento = '';
          updatedData.UnidadeFracionamentoDescricao = '';
          updatedData.Descricao = '';
          updatedData.Divisor = '';
        }
        break;

      case 'Taxas':
        if (value) {
          const selectedTaxa = dropdownOptions.taxas.find(
            t => String(t.id_taxas) === String(value)
          );
          
          if (selectedTaxa) {
            console.log('Found matching Taxa for edit:', selectedTaxa);
            
            updatedData.idTaxas = selectedId;
            updatedData.TaxaFinalidade = selectedTaxa.finalidade;
            updatedData.finalidade = selectedTaxa.finalidade;
            updatedData.tipo_taxa = selectedTaxa.tipo_taxa || '';
            updatedData["tipo taxa"] = selectedTaxa.tipo_taxa || '';
            updatedData.tempo_infusao = selectedTaxa.tempo_infusao || '';
            updatedData["Tempo infusão"] = selectedTaxa.tempo_infusao || '';
            updatedData.id_taxa = selectedTaxa.id_taxas;
            updatedData["ID Taxa"] = selectedTaxa.id_taxas;
          }
        } else {
          updatedData.idTaxas = null;
          updatedData.TaxaFinalidade = '';
          updatedData.finalidade = '';
          updatedData.tipo_taxa = '';
          updatedData["tipo taxa"] = '';
          updatedData.tempo_infusao = '';
          updatedData["Tempo infusão"] = '';
          updatedData.id_taxa = '';
          updatedData["ID Taxa"] = '';
        }
        break;

      case 'Tabela':
        if (value) {
          const selectedTabela = dropdownOptions.tabela.find(
            t => String(t.id_tabela) === String(value)
          );
          
          if (selectedTabela) {
            console.log('Found matching Tabela for edit:', selectedTabela);
            
            updatedData.idTabela = selectedId;
            updatedData.tabela = selectedTabela.tabela;
            updatedData.tabela_classe = selectedTabela.tabela_classe || '';
            updatedData.tabela_tipo = selectedTabela.tabela_tipo || '';
            updatedData.classe_Jaragua_do_sul = selectedTabela.classe_Jaragua_do_sul || '';
            updatedData.classificacao_tipo = selectedTabela.classificacao_tipo || '';
            updatedData.finalidade = selectedTabela.finalidade || '';
            updatedData.objetivo = selectedTabela.objetivo || '';
          }
        } else {
          updatedData.idTabela = null;
          updatedData.tabela = '';
          updatedData.tabela_classe = '';
          updatedData.tabela_tipo = '';
          updatedData.classe_Jaragua_do_sul = '';
          updatedData.classificacao_tipo = '';
          updatedData.finalidade = '';
          updatedData.objetivo = '';
        }
        break;

      case 'Armazenamento':
        if (value) {
          const selectedArm = dropdownOptions.armazenamento.find(
            a => String(a.idArmazenamento) === String(value)
          );
          
          if (selectedArm) {
            console.log('Found matching Armazenamento for edit:', selectedArm);
            
            updatedData.idArmazenamento = selectedId;
            updatedData.Armazenamento = selectedArm.Armazenamento;
          }
        } else {
          updatedData.idArmazenamento = null;
          updatedData.Armazenamento = '';
        }
        break;

      case 'tipo_medicamento':
        if (value) {
          const selectedMed = dropdownOptions.tipoMedicamento.find(
            m => String(m.id_medicamento) === String(value)
          );
          
          if (selectedMed) {
            console.log('Found matching Medicamento for edit:', selectedMed);
            
            updatedData.idMedicamento = selectedId;
            updatedData.tipo_medicamento = selectedMed.tipo_medicamento;
            updatedData.Medicamento = selectedMed.tipo_medicamento;
          }
        } else {
          updatedData.idMedicamento = null;
          updatedData.tipo_medicamento = '';
          updatedData.Medicamento = '';
        }
        break;

      case 'FatorConversao':
        if (value) {
          const selectedFator = dropdownOptions.fatorConversao.find(
            f => String(f.id_fatorconversao) === String(value)
          );
          
          if (selectedFator) {
            console.log('Found matching FatorConversao for edit:', selectedFator);
            
            updatedData.idFatorConversao = selectedId;
            updatedData.Fator_Conversão = selectedFator.fator;
            updatedData.fator = selectedFator.fator;
          }
        } else {
          updatedData.idFatorConversao = null;
          updatedData.Fator_Conversão = '';
          updatedData.fator = '';
        }
        break;
      
      default:
        console.error(`Campo não reconhecido: ${field}`);
    }
    
    // Atualizar o estado com uma força de atualização visual
    console.log(`Atualizando dados de edição para:`, updatedData);
    setEditedData(updatedData);
  };

  // Substitua a função handleSave atual por esta versão melhorada
  const handleSave = async () => {
    if (!editingRow) return;

    try {
      setLocalLoading(true);
      
      // Criar uma cópia limpa dos dados para o envio
      const cleanedData = { ...editedData };
      
      // Adiciona log para depuração
      console.log("Dados originais a serem enviados:", cleanedData);
      
      // Certifique-se de que todos os IDs são números
      const idFields = [
        'idPrincipioAtivo',
        'idUnidadeFracionamento',
        'idTaxas',
        'idTabela',
        'idViaAdministracao',
        'idClasseFarmaceutica',
        'idArmazenamento',
        'idMedicamento',
        'idFatorConversao'
      ];
      
      // Converte os IDs para números inteiros
      idFields.forEach(field => {
        if (cleanedData[field] && typeof cleanedData[field] === 'string') {
          cleanedData[field] = parseInt(cleanedData[field], 10);
        }
      });
      
      // Remove campos que não devem ser enviados ao backend
      const fieldsToRemove = [
        'UnidadeFracionamento', 
        'Unidade_Fracionamento',
        'Descricao',
        'PrincipioAtivo',
        'ViaAdministracao',
        'ClasseFarmaceutica',
        'Armazenamento',
        'tipo_medicamento',
        'Fator_Conversão'
      ];
      
      // Não remova os campos se eles forem necessários e não houver ID correspondente
      for (const field of fieldsToRemove) {
        const hasRelatedId = 
          (field === 'PrincipioAtivo' && cleanedData.idPrincipioAtivo) ||
          (field === 'UnidadeFracionamento' && cleanedData.idUnidadeFracionamento) ||
          (field === 'ViaAdministracao' && cleanedData.idViaAdministracao) ||
          (field === 'ClasseFarmaceutica' && cleanedData.idClasseFarmaceutica) ||
          (field === 'Armazenamento' && cleanedData.idArmazenamento) ||
          (field === 'tipo_medicamento' && cleanedData.idMedicamento) ||
          (field === 'Fator_Conversão' && cleanedData.idFatorConversao);
          
        if (hasRelatedId) {
          delete cleanedData[field];
        }
      }
      
      console.log("Dados limpos a serem enviados:", cleanedData);

      const response = await fetch(`http://localhost/backend-php/api/update_service.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      console.log("Resposta do servidor - Status:", response.status);

      // Primeiro tentar obter o corpo como texto para debug
      const responseText = await response.text();
      console.log("Corpo da resposta (texto):", responseText);
      
      // Verificar se a resposta é JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.warn("Resposta não é JSON válido:", e);
      }

      if (!response.ok) {
        throw new Error(responseData?.message || "Erro ao atualizar o serviço");
      }

      // Atualiza o estado global com os dados limpos
      updateService(cleanedData);

      // Limpa a edição
      setEditingRow(null);
      setEditedData({});
      setIsEditing(false);

      // Mostrar confirmação de sucesso
      showSuccessAlert("Serviço atualizado com sucesso!");
      console.log("Serviço atualizado com sucesso!");
      
      // Recarregar os dados para garantir atualização
      loadServiceData(1, true);
      
    } catch (error) {
      console.error("Erro ao atualizar o serviço:", error);
      showErrorAlert("Falha ao atualizar", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // Limpa os dados nulos ou indefinidos
  const cleanedData = useMemo(() => {
    return serviceData.map(item => 
      Object.fromEntries(
        Object.entries(item).filter(([_, value]) => value !== null && value !== undefined)
      )
    );
  }, [serviceData]);

  const handleChange = (event) => {
    const value = event.target.value;  
    console.log("Digitando:", value);
    setSearchTerm(value);
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  // Função para resetar a ordenação para o padrão
  const handleResetSort = () => {
    setSortField('id');
    setSortOrder('asc');
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return cleanedData;
  
    const searchTermLower = searchTerm.trim().toLowerCase();
    
    // Dividir o termo de pesquisa para busca parcial
    const searchTerms = searchTermLower.split(/\s+/);
    
    return cleanedData.filter(item => {
      // Busca no campo Cod (exata)
      const cod = (item.Cod || '').toString().toLowerCase();
      if (cod === searchTermLower) return true;
      
      // Busca em todos os campos relacionados ao Princípio Ativo
      const principioAtivo = [
        (item.Principio_Ativo || '').toString().toLowerCase(),
        (item.PrincipioAtivo || '').toString().toLowerCase(),
        (item["Princípio Ativo"] || '').toString().toLowerCase(),
        (item.PrincipioAtivoClassificado || '').toString().toLowerCase(),
        (item["Princípio_Ativo_Classificado"] || '').toString().toLowerCase()
      ].join(' ');
      
      // Verifica se todos os termos da pesquisa estão presentes no texto do princípio ativo
      const matchesPrincipioAtivo = searchTerms.every(term => 
        principioAtivo.includes(term)
      );
      
      // Busca em campos adicionais para melhorar a precisão
      const descricao = [
        (item.Descricao_Apresentacao || '').toString().toLowerCase(),
        (item.Descricao_Resumida || '').toString().toLowerCase(),
        (item.Descricao_Comercial || '').toString().toLowerCase()
      ].join(' ');
      
      // Busca parcial nos campos de descrição (menos prioritária)
      const matchesDescricao = searchTermLower.length > 3 && descricao.includes(searchTermLower);
      
      // Combinando os resultados
      return cod.includes(searchTermLower) || matchesPrincipioAtivo || matchesDescricao;
    });
  }, [searchTerm, cleanedData]);

  const searchResultCount = searchTerm.trim() 
  ? `${filteredData.length} resultados encontrados` 
  : null;

  return (
    <PageTransition>
      <div className="container">
        <Sidebar />
        
        <div className="main-content">
          <Header userName="Douglas" />
          
          <main>
            <div className="styled-container">
              <div className="mb-6 flex justify-between items-center encimatabela">
                <div className="organize-container">
                  <h2 className="organize-text">Ordenação</h2>
                  <div className="custom-select">
                    <select 
                      className="select-style" 
                      value={sortOrder} 
                      onChange={handleSortChange}
                    >
                      <option value="asc">Crescente</option>
                      <option value="desc">Decrescente</option>
                    </select>
                  </div>
                </div>
                
                {/* Mostrar informação sobre ordenação atual */}
                {sortField !== 'id' && (
                  <div className="px-3 py-1 bg-blue-50 rounded-md flex items-center ordenacao">
                    <span className="text-sm text-blue-700">
                      Ordenado por: <strong>{sortField}</strong> ({sortOrder === 'asc' ? 'crescente' : 'decrescente'})
                    </span>
                    <button 
                      className="ml-2 text-blue-600 hover:text-blue-800" 
                      onClick={handleResetSort}
                      title="Resetar ordenação"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="search-bar">
                      <Search className="search-icon" />
                      <input
                        type="text"
                        placeholder="Pesquisar por Cód. ou Princípio Ativo"
                        className="border pesquisa"
                        value={searchTerm}
                        onChange={handleChange}
                      />
                    </div>
                    
                    {/* Indicador de resultados da pesquisa */}
                    {searchTerm.trim() && (
                      <div className="text-xs text-gray-600 mt-1 ml-2">
                        {filteredData.length === 0 ? (
                          <span className="text-red-500">Nenhum resultado encontrado</span>
                        ) : (
                          <span>{filteredData.length} resultado{filteredData.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="button-container">
                  {selectedRows.size > 0 ? (
                    <>
                      {isEditing ? (
                        <button 
                          className="btn btn-danger" 
                          onClick={handleCancel}
                          disabled={localLoading}
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button 
                          className="btn btn-danger" 
                          onClick={handleDelete}
                          disabled={localLoading}
                        >
                          <Trash2 className="w-5 h-5" /> Excluir
                        </button>
                      )}
                      {isEditing ? (
                        <button 
                          className="btn btn-success" 
                          onClick={handleSave}
                          disabled={localLoading}
                        >
                          {localLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                      ) : (
                        <button 
                          className="btn btn-warning" 
                          onClick={handleEdit}
                          disabled={localLoading}
                        >
                          <Edit className="w-5 h-5" /> Alterar
                        </button>
                      )}
                    </>
                  ) : (
                    isAdding ? (
                      <>
                        <button 
                          className="btn btn-danger" 
                          onClick={handleCancelAdd}
                          disabled={localLoading}
                        >
                          Cancelar
                        </button>
                        <button 
                          className="btn btn-success" 
                          onClick={handleSaveNew}
                          disabled={localLoading}
                        >
                          {localLoading ? (
                            <>
                              <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                              Salvando...
                            </>
                          ) : 'Salvar'}
                        </button>
                      </>
                    ) : (
                      <button 
                        className="button buttontxt btn-primary" 
                        onClick={handleAdd}
                        disabled={localLoading}
                      >
                        <Plus /> Adicionar
                      </button>
                    )
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <img
                    src="../src/assets/loadingcorreto.gif"
                    alt="Carregando..."
                    className="w-12 h-12"
                  />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-red-500">Erro: {error}</p>
                  <button
                    onClick={handleLoadData}
                    className="button buttontxt flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" /> Tentar novamente
                  </button>
                </div>
              ) : serviceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-gray-500">Nenhum dado disponível</p>
                  <button
                    onClick={handleLoadData}
                    className="button buttontxt flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" /> Carregar dados
                  </button>
                </div>
              ) : (
                <div className="h-[calc(100vh-220px)] overflow-hidden">
                  <DataTable
                    ref={dataTableRef}
                    data={filteredData}
                    searchTerm={searchTerm}
                    sortOrder={sortOrder}
                    sortField={sortField}
                    changeSort={changeSort}
                    onSelectionChange={toggleRowSelection}
                    editingRow={editingRow}
                    editedData={editedData}
                    handleInputChange={handleInputChange}
                    handleDropdownChange={handleDropdownChange}
                    selectedRows={selectedRows}
                    isAdding={isAdding}
                    newServiceData={newServiceData}
                    handleNewInputChange={handleNewInputChange}
                    handleNewDropdownChange={handleNewDropdownChange}
                    dropdownOptions={dropdownOptions}
                    updateTrigger={updateCounter}
                  />
                  {hasMore && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={loadMore}
                        className="button buttontxt"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                            Carregando...
                          </span>
                        ) : (
                          <span>Mostrar mais</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}