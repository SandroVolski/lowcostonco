import React, { createContext, useState, useContext, useEffect } from "react";

// Criando o contexto para as opções de dropdown
const DropdownOptionsContext = createContext();

// Hook personalizado para facilitar o uso do contexto
export const useDropdownOptions = () => useContext(DropdownOptionsContext);

// Provider do contexto
export const DropdownOptionsProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para armazenar todas as opções dos dropdowns
  const [dropdownOptions, setDropdownOptions] = useState({
    viaAdministracao: [],
    classeFarmaceutica: [],
    principioAtivo: [],
    armazenamento: [],
    tipoMedicamento: [],
    unidadeFracionamento: [],
    fatorConversao: [],
    taxas: []
  });

  // Função para carregar as opções dos dropdowns
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        setLoading(true);
        
        // Via Administração
        const viaResponse = await fetch('http://localhost/backend-php/api/get_via_administracao.php');
        const viaData = await viaResponse.json();
        
        // Classe Farmacêutica
        const classeResponse = await fetch('http://localhost/backend-php/api/get_classe_farmaceutica.php');
        const classeData = await classeResponse.json();
        
        // Princípio Ativo
        const principioResponse = await fetch('http://localhost/backend-php/api/get_principio_ativo.php');
        const principioData = await principioResponse.json();
        
        // Armazenamento
        const armazenamentoResponse = await fetch('http://localhost/backend-php/api/get_armazenamento.php');
        const armazenamentoData = await armazenamentoResponse.json();
        
        // Tipo Medicamento
        const medicamentoResponse = await fetch('http://localhost/backend-php/api/get_tipo_medicamento.php');
        const medicamentoData = await medicamentoResponse.json();
        
        // Unidade Fracionamento
        const unidadeResponse = await fetch('http://localhost/backend-php/api/get_unidade_fracionamento.php');
        const unidadeData = await unidadeResponse.json();
        
        // Fator Conversão
        const fatorResponse = await fetch('http://localhost/backend-php/api/get_fator_conversao.php');
        const fatorData = await fatorResponse.json();
        
        // Taxas
        const taxasResponse = await fetch('http://localhost/backend-php/api/get_taxas.php');
        const taxasData = await taxasResponse.json();
        
        // Atualizar o estado com todas as opções
        setDropdownOptions({
          viaAdministracao: viaData,
          classeFarmaceutica: classeData,
          principioAtivo: principioData,
          armazenamento: armazenamentoData,
          tipoMedicamento: medicamentoData,
          unidadeFracionamento: unidadeData,
          fatorConversao: fatorData,
          taxas: taxasData
        });
        
      } catch (error) {
        console.error("Erro ao carregar opções dos dropdowns:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDropdownOptions();
  }, []);
  
  // Define dados estáticos para desenvolvimento enquanto as APIs não estão prontas
  const staticDropdownOptions = {
    viaAdministracao: [
      { idviaadministracao: 1, Via_administracao: "Injetável" },
      { idviaadministracao: 2, Via_administracao: "Oral" },
      { idviaadministracao: 3, Via_administracao: "Não se Aplica" },
      { idviaadministracao: 4, Via_administracao: "Outras" },
      { idviaadministracao: 88, Via_administracao: "Necessita Classificação" },
      { idviaadministracao: 5, Via_administracao: "Subcutânea" }
    ],
    classeFarmaceutica: [
      { id_medicamento: 1, ClasseFarmaceutica: "Biológico" },
      { id_medicamento: 2, ClasseFarmaceutica: "Referência" },
      { id_medicamento: 3, ClasseFarmaceutica: "Genérico" },
      { id_medicamento: 4, ClasseFarmaceutica: "Similar" },
      { id_medicamento: 5, ClasseFarmaceutica: "Registro Cancelado" },
      { id_medicamento: 6, ClasseFarmaceutica: "Específico" },
      { id_medicamento: 7, ClasseFarmaceutica: "Outros" },
      { id_medicamento: 8, ClasseFarmaceutica: "Ausência ANVISA" },
      { id_medicamento: 9, ClasseFarmaceutica: "Alimento" },
      { id_medicamento: 10, ClasseFarmaceutica: "Referência" },
      { id_medicamento: 11, ClasseFarmaceutica: "Cosmético" },
      { id_medicamento: 12, ClasseFarmaceutica: "Fitoterápico" },
      { id_medicamento: 13, ClasseFarmaceutica: "Divergência ANVISA" },
      { id_medicamento: 14, ClasseFarmaceutica: "Espessante Alimentar" },
      { id_medicamento: 15, ClasseFarmaceutica: "Homeopatia" },
      { id_medicamento: 16, ClasseFarmaceutica: "Radiofármaco" },
      { id_medicamento: 17, ClasseFarmaceutica: "Produto de Terapia Avançada" },
      { id_medicamento: 18, ClasseFarmaceutica: "Fórmula" },
      { id_medicamento: 19, ClasseFarmaceutica: "Não Se Aplica" },
      { id_medicamento: 88, ClasseFarmaceutica: "Necessita Classificação" },
      { id_medicamento: 20, ClasseFarmaceutica: "Biossimilar" }
    ],
    armazenamento: [
      { idArmazenamento: 1, Armazenamento: "Refrigerado" },
      { idArmazenamento: 2, Armazenamento: "Temperatura Ambiente" },
      { idArmazenamento: 88, Armazenamento: "Necessita Classificação" },
      { idArmazenamento: 3, Armazenamento: "Não Se Aplica" }
    ],
    tipoMedicamento: [
      { id_medicamento: 1, tipo_medicamento: "Referência" },
      { id_medicamento: 2, tipo_medicamento: "Biológico" },
      { id_medicamento: 3, tipo_medicamento: "Similar" },
      { id_medicamento: 4, tipo_medicamento: "Genérico" },
      { id_medicamento: 5, tipo_medicamento: "Específico" },
      { id_medicamento: 6, tipo_medicamento: "Fitoterápico" },
      { id_medicamento: 7, tipo_medicamento: "Sem Especificação" },
      { id_medicamento: 8, tipo_medicamento: "Produto de Terapia Avançada" },
      { id_medicamento: 9, tipo_medicamento: "Radiofármaco" },
      { id_medicamento: 88, tipo_medicamento: "Necessita Classificação" },
      { id_medicamento: 10, tipo_medicamento: "Não se Aplica" }
    ],
    unidadeFracionamento: [
      { id_unidadefracionamento: 1, UnidadeFracionamento: "SER", Descricao: "Seringa", Divisor: "Não" },
      { id_unidadefracionamento: 2, UnidadeFracionamento: "FA", Descricao: "Frasco Ampola", Divisor: "Não" },
      { id_unidadefracionamento: 3, UnidadeFracionamento: "COM", Descricao: "Comprimido", Divisor: "Sim" },
      { id_unidadefracionamento: 4, UnidadeFracionamento: "CAP", Descricao: "Cápsula", Divisor: "Sim" },
      { id_unidadefracionamento: 5, UnidadeFracionamento: "ML", Descricao: "Mililitro", Divisor: "Sim" },
      { id_unidadefracionamento: 6, UnidadeFracionamento: "G", Descricao: "Grama", Divisor: "Sim" },
      { id_unidadefracionamento: 7, UnidadeFracionamento: "GTS", Descricao: "Gotas", Divisor: "Sim" },
      { id_unidadefracionamento: 8, UnidadeFracionamento: "UN", Descricao: "Unidade", Divisor: "Não" },
      { id_unidadefracionamento: 9, UnidadeFracionamento: "AMP", Descricao: "Ampola", Divisor: "Não" },
      { id_unidadefracionamento: 10, UnidadeFracionamento: "DRG", Descricao: "Drágea", Divisor: "Sim" },
      { id_unidadefracionamento: 11, UnidadeFracionamento: "KIT", Descricao: "Kit", Divisor: "Não" },
      { id_unidadefracionamento: 12, UnidadeFracionamento: "FR", Descricao: "Frasco", Divisor: "Não" },
      { id_unidadefracionamento: 13, UnidadeFracionamento: "MG", Descricao: "Miligrama", Divisor: "Sim" },
      { id_unidadefracionamento: 14, UnidadeFracionamento: "ADES", Descricao: "Adesivo", Divisor: "Não" },
      { id_unidadefracionamento: 35, UnidadeFracionamento: "Não se Aplica", Descricao: "Não se Aplica", Divisor: null },
      { id_unidadefracionamento: 88, UnidadeFracionamento: "Necessita Classificação", Descricao: "Necessita Classificação", Divisor: null }
    ],
    fatorConversao: [
      { id_fatorconversao: 0, fator: "0" },
      { id_fatorconversao: 1, fator: "1" },
      { id_fatorconversao: 2, fator: "1" },
      { id_fatorconversao: 3, fator: "1" },
      { id_fatorconversao: 4, fator: "1" }
    ],
    taxas: [
      { id_taxas: 1, finalidade: "Infusão", tipo_taxa: "Taxa", tempo_infusao: "03:00:00" },
      { id_taxas: 2, finalidade: "Infusão Não Oncológico", tipo_taxa: "Taxa", tempo_infusao: "03:00:00" },
      { id_taxas: 3, finalidade: "Heparinização Cateter/Bifosfonados", tipo_taxa: "Taxa", tempo_infusao: "00:30:00" },
      { id_taxas: 4, finalidade: "Aplicação de Injeção", tipo_taxa: "Taxa", tempo_infusao: "00:15:00" },
      { id_taxas: 5, finalidade: "Curativo", tipo_taxa: "Taxa", tempo_infusao: "00:15:00" },
      { id_taxas: 6, finalidade: "Infusão Oncológicos", tipo_taxa: "Pacote", tempo_infusao: "03:00:00" },
      { id_taxas: 7, finalidade: "Infusão Imuno não Oncológico", tipo_taxa: "Pacote", tempo_infusao: "03:00:00" },
      { id_taxas: 8, finalidade: "Preparo Medicamento", tipo_taxa: "Taxa", tempo_infusao: "00:00:00" },
      { id_taxas: 9, finalidade: "Outras Taxas", tipo_taxa: "Taxa", tempo_infusao: "00:00:00" },
      { id_taxas: 10, finalidade: "Honorário", tipo_taxa: "Honorários", tempo_infusao: "00:00:00" },
      { id_taxas: 11, finalidade: "Necessita Classificação", tipo_taxa: "Necessita Classificação", tempo_infusao: "00:00:00" },
      { id_taxas: 12, finalidade: "Heparinização de Cateter", tipo_taxa: "Taxa", tempo_infusao: "00:30:00" },
      { id_taxas: 13, finalidade: "Aplicação Medicamento/Bifosfonados", tipo_taxa: "Taxa", tempo_infusao: "00:15:00" },
      { id_taxas: 16, finalidade: "Taxas a Classificar", tipo_taxa: "Taxa Classificar", tempo_infusao: "00:00:00" },
      { id_taxas: 999, finalidade: "Necessita Classificação", tipo_taxa: "Necessita Classificação", tempo_infusao: "00:00:00" },
      { id_taxas: 14, finalidade: "Hospitalização", tipo_taxa: "Diária", tempo_infusao: "10:00:00" },
      { id_taxas: 15, finalidade: "Exames", tipo_taxa: "Exames", tempo_infusao: "00:00:00" }
    ],
    principioAtivo: [
      // Este é apenas um exemplo, no ambiente real você carregaria todos os princípios ativos
      { idPrincipioAtivo: 1, PrincipioAtivo: "Princípio Ativo 1" },
      { idPrincipioAtivo: 2, PrincipioAtivo: "Princípio Ativo 2" },
      { idPrincipioAtivo: 3, PrincipioAtivo: "Princípio Ativo 3" },
      { idPrincipioAtivo: 4096, PrincipioAtivo: "Princípio Ativo Especial 1", idPrincipioAtivo: 5000 },
      { idPrincipioAtivo: 4097, PrincipioAtivo: "Princípio Ativo Especial 2", idPrincipioAtivo: 2222 }
    ]
  };

  // Valores a serem disponibilizados pelo contexto
  const value = {
    dropdownOptions: loading ? staticDropdownOptions : dropdownOptions,
    loading,
    error
  };

  return (
    <DropdownOptionsContext.Provider value={value}>
      {children}
    </DropdownOptionsContext.Provider>
  );
};