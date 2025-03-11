import React, { useState, useMemo, useEffect } from "react";
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import { DataTable } from '../../components/DataTable';
import PageTransition from "../../components/PageTransition";
import { useServiceData } from '../../components/ServiceContext'; // Importe o contexto

import '../../App.css';
import './ServicoRelacionada.css';

import { Search, Plus, Trash2, Edit, RefreshCw } from "lucide-react";

export default function ServicoRelacionada() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    Codigo_TUSS: '',
    Descricao_Apresentacao: '',
    Descricao_Resumida: '',
    Descricao_Comercial: '',
    Concentracao: '',
    Fracionamento: '',
    Laboratorio: '',
    Revisado: 0,
    
    // Campos de RegistroVisa
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
    
    // Outros campos
    Via_administracao: '',  // Note que este campo deve corresponder ao nome esperado no PHP
    ClasseFarmaceutica: '',
    PrincipioAtivo: '',
    PrincipioAtivoClassificado: '',
    FaseUGF: '',
    Armazenamento: '',
    tipo_medicamento: '',
    
    // Unidade de Fracionamento
    UnidadeFracionamento: '',
    UnidadeFracionamentoDescricao: '',  // Nome usado no PHP
    Divisor: '',
    
    // Taxas
    tipo_taxa: '',
    TaxaFinalidade: '',  // Nome usado no PHP
    tempo_infusao: ''
  });

  // Usando o contexto de serviços
  const { 
    serviceData, 
    loading, 
    error, 
    hasMore, 
    sortOrder, 
    setSortOrder, 
    loadMore,
    updateService,
    deleteService,
    loadServiceData,
    initialized,
    addService
  } = useServiceData();

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

    try {
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

      console.log("Serviço excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir o serviço:", error);
    }
  };

  // Função para habilitar a edição de uma linha
  const handleEdit = () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) return;
  
    const rowToEdit = serviceData.find(item => item.id === selectedRowId);
    if (!rowToEdit) return;
  
    setEditingRow(selectedRowId);
    setEditedData(rowToEdit);
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setEditingRow(null);
    setEditedData({});
    setIsEditing(false);
  };

  // Adicione estas funções ao componente
  const handleAdd = () => {
    setIsAdding(true);
    setSelectedRows(new Set()); // Limpa qualquer seleção existente
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewServiceData({
      Codigo_TUSS: '',
    Descricao_Apresentacao: '',
    Descricao_Resumida: '',
    Descricao_Comercial: '',
    Concentracao: '',
    Fracionamento: '',
    Laboratorio: '',
    Revisado: 0,
    
    // Campos de RegistroVisa
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
    
    // Outros campos
    Via_administracao: '',  // Note que este campo deve corresponder ao nome esperado no PHP
    ClasseFarmaceutica: '',
    PrincipioAtivo: '',
    PrincipioAtivoClassificado: '',
    FaseUGF: '',
    Armazenamento: '',
    tipo_medicamento: '',
    
    // Unidade de Fracionamento
    UnidadeFracionamento: '',
    UnidadeFracionamentoDescricao: '',  // Nome usado no PHP
    Divisor: '',
    
    // Taxas
    tipo_taxa: '',
    TaxaFinalidade: '',  // Nome usado no PHP
    tempo_infusao: ''
    });
  };

  const handleSaveNew = async () => {
    try {
      console.log("Dados a serem enviados:", JSON.stringify(newServiceData));
      await addService(newServiceData);
      setIsAdding(false);
      setNewServiceData({
        Codigo_TUSS: '',
        Descricao_Apresentacao: '',
        Descricao_Resumida: '',
        Descricao_Comercial: '',
        Concentracao: '',
        Fracionamento: '',
        Laboratorio: '',
        Revisado: 0,
        
        // Campos de RegistroVisa
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
        
        // Outros campos
        Via_administracao: '',  // Note que este campo deve corresponder ao nome esperado no PHP
        ClasseFarmaceutica: '',
        PrincipioAtivo: '',
        PrincipioAtivoClassificado: '',
        FaseUGF: '',
        Armazenamento: '',
        tipo_medicamento: '',
        
        // Unidade de Fracionamento
        UnidadeFracionamento: '',
        UnidadeFracionamentoDescricao: '',  // Nome usado no PHP
        Divisor: '',
        
        // Taxas
        tipo_taxa: '',
        TaxaFinalidade: '',  // Nome usado no PHP
        tempo_infusao: ''
      });
      console.log("Serviço adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar o serviço:", error);
    }
  };

  // Função para capturar as alterações nos campos do novo serviço
  const handleNewInputChange = (e, field, nestedObject = null) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    
    if (nestedObject) {
        setNewServiceData(prev => ({
            ...prev,
            [nestedObject]: {
                ...(prev[nestedObject] || {}), // Garante que o objeto existe
                [field]: value
            }
        }));
    } else {
        setNewServiceData(prev => ({
            ...prev,
            [field]: value
        }));
    }
  };
  
  const handleSave = async () => {
    if (!editingRow) return;
  
    try {
      console.log("Dados completos a serem enviados:", editedData);

      const response = await fetch(`http://localhost/backend-php/api/update_service.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      });

      console.log("Resposta do servidor - Status:", response.status);
  
      const responseBody = await response.text();
      console.log("Corpo da resposta:", responseBody);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar o serviço");
      }
  
      // Atualiza o estado global
      updateService(editedData);

      // Limpa a edição
      setEditingRow(null);
      setEditedData({});
      setIsEditing(false);
  
      console.log("Serviço atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar o serviço:", error);
    }
  };
  
  // Função para capturar as alterações nos campos editáveis
  const handleInputChange = (e, field) => {
    const value = e.target.value;
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return cleanedData;
  
    return cleanedData.filter(item => {
      const id = item.id?.toString() ?? "";
      const tuss = item.codigoTUSS?.toString() ?? "";
  
      return id.includes(searchTerm) || tuss.includes(searchTerm);
    });
  }, [searchTerm, cleanedData]);

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
                  <h2 className="organize-text">Organizar por</h2>
                  <div className="custom-select">
                    <select 
                      className="select-style" 
                      value={sortOrder} 
                      onChange={handleSortChange}
                    >
                      <option value="asc">Ordem Crescente</option>
                      <option value="desc">Ordem Decrescente</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="search-bar">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Pesquisar"
                      className="border pesquisa"
                      value={searchTerm}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="button-container">
                    {selectedRows.size > 0 ? (
                      <>
                        {isEditing ? (
                          <button className="btn btn-danger" onClick={handleCancel}>
                            Cancelar
                          </button>
                        ) : (
                          <button className="btn btn-danger" onClick={handleDelete}>
                            <Trash2 className="w-5 h-5" /> Excluir
                          </button>
                        )}
                        {isEditing ? (
                          <button className="btn btn-success" onClick={handleSave}>
                            Salvar
                          </button>
                        ) : (
                          <button className="btn btn-warning" onClick={handleEdit}>
                            <Edit className="w-5 h-5" /> Alterar
                          </button>
                        )}
                      </>
                    ) : (
                      isAdding ? (
                        <>
                          <button className="btn btn-danger" onClick={handleCancelAdd}>
                            Cancelar
                          </button>
                          <button className="btn btn-success" onClick={handleSaveNew}>
                            Salvar
                          </button>
                        </>
                      ) : (
                        <button className="button buttontxt btn-primary" onClick={handleAdd}>
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
                    data={filteredData}
                    searchTerm={searchTerm}
                    sortOrder={sortOrder}
                    onSelectionChange={toggleRowSelection}
                    editingRow={editingRow}
                    editedData={editedData}
                    handleInputChange={handleInputChange}
                    selectedRows={selectedRows}
                    isAdding={isAdding}  // Nova prop
                    newServiceData={newServiceData}  // Nova prop
                    handleNewInputChange={handleNewInputChange}  // Nova prop
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