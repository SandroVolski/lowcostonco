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
    initialized
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
                      <button className="button buttontxt btn-primary">
                        <Plus /> Adicionar
                      </button>
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