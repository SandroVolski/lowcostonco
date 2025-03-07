import React, { useState, useEffect } from "react";
import { useMemo } from "react";
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import { DataTable } from '../../components/DataTable';

import PageTransition from "../../components/PageTransition";

import '../../App.css';
import './ServicoRelacionada.css';

import { Search, Printer, Share2, Plus, Trash2, Edit } from "lucide-react";

export default function ServicoRelacionada() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [data, setData] = useState([]); // Estado para armazenar os dados iniciais
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [error, setError] = useState(null); // Estado de erro
  const [page, setPage] = useState(1); // Estado para controlar a página atual
  const [hasMore, setHasMore] = useState(true); // Estado para verificar se há mais dados
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null); // Estado para controlar a linha em edição
  const [editedData, setEditedData] = useState({}); // Estado para armazenar os dados editados
  const [isEditing, setIsEditing] = useState(false); // Estado para controlar o modo de edição

  // Função para alternar a seleção de uma linha
  const toggleRowSelection = (rowId) => {
    if (isEditing) return; // Não permite desselecionar durante a edição

    const adjustedRowId = Number(rowId); // Converte rowId para número e soma 1
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adjustedRowId)) {
        newSet.delete(adjustedRowId); // Desseleciona a linha se já estiver selecionada
      } else {
        newSet.clear(); // Limpa todas as seleções anteriores
        newSet.add(adjustedRowId); // Seleciona a nova linha
      }
      console.log("Linha selecionada:", adjustedRowId);
      return newSet;
    });
  };

  // Função para buscar os dados iniciais
  const fetchInitialData = async () => {
    try {
      setLoading(true); // Define o estado de carregamento antes de buscar os dados
      
      const response = await fetch(`http://localhost/backend-php/api/get_services.php?page=${page}&limit=500&order=${sortOrder}`);
      if (!response.ok) {
        throw new Error(`Erro ao carregar os dados: ${response.status}`);
      }
  
      const result = await response.json();
  
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
  
      if (result.length === 0) {
        setHasMore(false);
      } else {
        // Mapeia os dados da API para o formato esperado pela tabela
        const mappedData = result.map(item => ({
          id: item.id,
          codigoTUSS: item.Codigo_TUSS,
          Descricao_Apresentacao: item.Descricao_Apresentacao,
          Descricao_Resumida: item.Descricao_Resumida,
          Descricao_Comercial: item.Descricao_Comercial,
          Concentracao: item.Concentracao,
          Unidade_Fracionamento: item.UnidadeFracionamento,
          Fracionamento: item.Fracionamento,
          "Laboratório": item.Laboratorio,
          Revisado: item.Revisado,
          "Cód GGrem": item.Cod_Ggrem, // Ajustado para corresponder ao expandableHeaders
          Princípio_Ativo: item.PrincipioAtivo,
          Principio_Ativo: item.Principio_Ativo,
          Laboratorio: item.Lab,
          "CNPJ Lab": item.cnpj_lab, // Ajustado para corresponder ao expandableHeaders
          "Classe Terapêutica": item.Classe_Terapeutica, // Ajustado para corresponder ao expandableHeaders
          "Tipo do Produto": item.Tipo_Porduto, // Ajustado para corresponder ao expandableHeaders
          "Regime Preço": item.Regime_Preco, // Ajustado para corresponder ao expandableHeaders
          "Restrição Hosp": item.Restricao_Hosp, // Ajustado para corresponder ao expandableHeaders
          Cap: item.Cap,
          Confaz87: item.Confaz87,
          ICMS0: item.Icms0,
          Lista: item.Lista,
          Status: item.Status,
          Tabela: item.tabela,
          "Tabela Classe": item.tabela_classe, // Ajustado para corresponder ao expandableHeaders
          "Tabela tipo": item.tabela_tipo, // Ajustado para corresponder ao expandableHeaders
          "Classe JaraguaSul": item.classe_Jaragua_do_sul, // Ajustado para corresponder ao expandableHeaders
          "Classificação tipo": item.classificacao_tipo, // Ajustado para corresponder ao expandableHeaders
          Finalidade: item.finalidade,
          Objetivo: item.objetivo,
          "Via_Administração": item.Via_administracao, // Ajustado para corresponder ao expandableHeaders
          "Classe_Farmaceutica": item.ClasseFarmaceutica, // Ajustado para corresponder ao expandableHeaders
          "Princípio_Ativo_Classificado": item.PrincipioAtivoClassificado, // Ajustado para corresponder ao expandableHeaders
          FaseuGF: item.FaseUGF,
          Armazenamento: item.Armazenamento,
          Medicamento: item.tipo_medicamento,
          Descricao: item.UnidadeFracionamentoDescricao, // Ajustado para corresponder ao expandableHeaders
          Divisor: item.Divisor,
          "Fator_Conversão": item.id_fatorconversao, // Ajustado para corresponder ao expandableHeaders
          "ID Taxa": item.id_taxas, // Ajustado para corresponder ao expandableHeaders
          "tipo taxa": item.tipo_taxa, // Ajustado para corresponder ao expandableHeaders
          finalidade: item.TaxaFinalidade, // Ajustado para corresponder ao expandableHeaders
          "Tempo infusão": item.tempo_infusao // Ajustado para corresponder ao expandableHeaders
        }));

        setData((prevData) => [...prevData, ...mappedData]);
      }
    } catch (error) {
      console.error("Erro ao buscar os serviços:", error);
      setError(error.message);
    } finally {
      setLoading(false); // Define o carregamento como concluído
    }
  };

  const handleDelete = async () => {
    const selectedRowId = Array.from(selectedRows)[0]; // Pega o ID da linha selecionada
    console.log("ID da linha selecionada:", selectedRowId); // Verifica o valor do ID selecionado
    if (!selectedRowId) return; // Se nenhuma linha estiver selecionada, não faz nada

    try {
      const response = await fetch(`http://localhost/backend-php/api/delete_service.php?id=${selectedRowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir o serviço");
      }

      // Remove a linha excluída do estado `data`
      setData((prevData) => prevData.filter(item => item.id !== selectedRowId));

      // Limpa a seleção
      setSelectedRows(new Set());

      console.log("Serviço excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir o serviço:", error);
    }
  };


  // Função para habilitar a edição de uma linha
  const handleEdit = () => {
    const selectedRowId = Array.from(selectedRows)[0]; // Pega o ID da linha selecionada
    if (!selectedRowId) return; // Se nenhuma linha estiver selecionada, não faz nada
  
    const rowToEdit = data.find(item => item.id === selectedRowId);
    if (!rowToEdit) return;
  
    setEditingRow(selectedRowId); // Define a linha em edição
    setEditedData(rowToEdit); // Preenche os dados editados com os valores atuais
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setEditingRow(null); // Limpa a linha em edição
    setEditedData({}); // Limpa os dados editados
    setIsEditing(false); // Desativa o modo de edição
  };
  
  const handleSave = async () => {
    if (!editingRow) return; // Se nenhuma linha estiver em edição, não faz nada
  
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
  
      // Atualiza o estado `data` com os dados editados
      setData((prevData) =>
        prevData.map(item =>
          item.id === editingRow ? { ...item, ...editedData } : item
        )
      );

      // Limpa a edição
      setEditingRow(null);
      setEditedData({});
      setIsEditing(false); // Desativa o modo de edição
  
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

  // Busca os dados iniciais quando o componente é montado ou a página muda
  useEffect(() => {
    fetchInitialData();
  }, [page, sortOrder]);

  // Limpa os dados nulos ou indefinidos
  const cleanedData = useMemo(() => {
    return data.map(item => 
      Object.fromEntries(
        Object.entries(item).filter(([_, value]) => value !== null && value !== undefined)
      )
    );
  }, [data]);

  const handleChange = (event) => {
    const value = event.target.value;  
    console.log("Digitando:", value);
    setSearchTerm(value); // Garante que todo o valor digitado seja atualizado corretamente
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setPage(1); // Reinicia a página ao mudar a ordenação
    setData([]); // Limpa os dados existentes
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return cleanedData; // Se estiver vazio, retorna todos os dados
  
    return cleanedData.filter(item => {
      const id = item.id?.toString() ?? ""; // Converte o ID para string (se existir)
      const tuss = item.codigoTUSS?.toString() ?? ""; // Converte o Código TUSS para string (se existir)
  
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
                      placeholder="Pesquisar por ID ou TUSS"
                      className="border pesquisa"
                      value={searchTerm}
                      onChange={handleChange}
                    />
                  </div>
                  
                  {/*<button className="button" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button> */}
                  
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

              {/* 🔹 Verifica se está carregando ou se deu erro */}
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <img
                    src="../src/assets/loadingcorreto.gif"
                    alt="Carregando..."
                    className="w-12 h-12" // Ajuste o tamanho conforme necessário
                  />
                </div>
              ) : error ? (
                <p className="text-red-500">Erro: {error}</p>
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
                  {/* Botão "Mostrar mais" */}
                  {hasMore && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => setPage(prev => prev + 1)}
                        className="button buttontxt"
                      >
                        <span>Mostrar mais</span>
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