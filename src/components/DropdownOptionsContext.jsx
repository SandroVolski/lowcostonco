import React, { createContext, useState, useContext, useEffect } from "react";
import CacheService from "../services/CacheService";

// Criando o contexto para as opções de dropdown
const DropdownOptionsContext = createContext();

// Hook personalizado para facilitar o uso do contexto
export const useDropdownOptions = () => useContext(DropdownOptionsContext);


const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api";

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
    { idPrincipioAtivo: 1, PrincipioAtivo: "Princípio Ativo 1" },
    { idPrincipioAtivo: 2, PrincipioAtivo: "Princípio Ativo 2" },
    { idPrincipioAtivo: 3, PrincipioAtivo: "Princípio Ativo 3" },
    { idPrincipioAtivo: 5000, PrincipioAtivo: "Princípio Ativo Especial 1" },
    { idPrincipioAtivo: 2222, PrincipioAtivo: "Princípio Ativo Especial 2" },
    { idPrincipioAtivo: 4000, PrincipioAtivo: "Princípio Ativo Especial 3" },
    // Adicione mais itens conforme necessário com IDs únicos
  ],
  tabela: [
    { id_tabela: 1, tabela: "Medicamento Oncologia", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Necessita Classificação", objetivo: "Medicamentos" },
    { id_tabela: 2, tabela: "Imunobiológicos Não Oncológicos", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Medicamentos", objetivo: "Reembolso Serviço" },
    { id_tabela: 3, tabela: "Medicamentos de Suporte", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Medicamentos", objetivo: "Reembolso Serviço" },
    { id_tabela: 4, tabela: "Materiais", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Material", classificacao_tipo: "Material", finalidade: "Materiais", objetivo: "Reembolso Serviço" },
    { id_tabela: 5, tabela: "Taxas e Diárias", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Taxas", objetivo: "Custeio Serviço" },
    { id_tabela: 6, tabela: "Pacotes", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Pacote", finalidade: "Pacotes", objetivo: "Custeio Serviço" },
    { id_tabela: 7, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Honorário", finalidade: "Demais Honorários", objetivo: "Remuneração Profissional" },
    { id_tabela: 8, tabela: "Não Classificado", tabela_classe: "", tabela_tipo: "Não Classificado", classe_Jaragua_do_sul: "", classificacao_tipo: "Não Classificado (8)", finalidade: "", objetivo: "" },
    { id_tabela: 9, tabela: "Medicamento Oral", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Medicamentos", objetivo: "Reembolso Serviço" },
    { id_tabela: 10, tabela: "Outros Medicamentos", tabela_classe: "Geral", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Medicamentos", objetivo: "Reembolso Serviço" },
    { id_tabela: 11, tabela: "Exames", tabela_classe: "Suporte", tabela_tipo: "Exames", classe_Jaragua_do_sul: "Outros Serviços", classificacao_tipo: "Exame", finalidade: "Outros Serviços", objetivo: "Remuneração Profissional e Custeio Serviço" },
    { id_tabela: 12, tabela: "Taxas?", tabela_classe: "Geral", tabela_tipo: "Não Classificado", classe_Jaragua_do_sul: "", classificacao_tipo: "Não Classificado (12)", finalidade: "", objetivo: "" },
    { id_tabela: 88, tabela: "Necessita Classificação", tabela_classe: "", tabela_tipo: "Não Classificado", classe_Jaragua_do_sul: "", classificacao_tipo: "Não Classificado (88)", finalidade: "", objetivo: "" },
    { id_tabela: 13, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consulta Médica", classificacao_tipo: "Honorário", finalidade: "Consulta Médica", objetivo: "Remuneração Profissional" },
    { id_tabela: 14, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consulta Multi", classificacao_tipo: "Honorário", finalidade: "Consulta Psicologia", objetivo: "Remuneração Profissional" },
    { id_tabela: 15, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consulta Multi", classificacao_tipo: "Honorário", finalidade: "Consulta Nutricionista", objetivo: "Remuneração Profissional" },
    { id_tabela: 16, tabela: "Honorários", tabela_classe: "Oncologia", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Honorário", finalidade: "Honorários Planejamento", objetivo: "Remuneração Profissional" },
    { id_tabela: 17, tabela: "Honorários", tabela_classe: "Oncologia", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Honorário", finalidade: "Honorários Subsequentes", objetivo: "Remuneração Profissional" },
    { id_tabela: 18, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Honorário", finalidade: "Atendimentos Outras Especialidades", objetivo: "Remuneração Profissional" },
    { id_tabela: 19, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consultas", classificacao_tipo: "Honorário", finalidade: "", objetivo: "Remuneração Profissional" },
    { id_tabela: 20, tabela: "Taxas e Diárias", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Infusão Endovenosa", objetivo: "Custeio Serviço" },
    { id_tabela: 21, tabela: "Taxas e Diárias", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Taxa de Curativo", objetivo: "Custeio Serviço" },
    { id_tabela: 22, tabela: "Taxas e Diárias", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Taxa Aplicação SC", objetivo: "Custeio Serviço" },
    { id_tabela: 23, tabela: "Taxas e Diárias", tabela_classe: "Suporte", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Taxa Genérica", objetivo: "Custeio Serviço" },
    { id_tabela: 24, tabela: "Taxas e Diárias", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Taxa de Observação - Até 06hrs", objetivo: "Custeio Serviço" },
    { id_tabela: 25, tabela: "Taxas e Diárias", tabela_classe: "Oncologia", tabela_tipo: "Taxas", classe_Jaragua_do_sul: "Procedimentos/Infusões", classificacao_tipo: "Taxa", finalidade: "Taxa de Permeabilização de Cateter", objetivo: "Custeio Serviço" },
    { id_tabela: 26, tabela: "Procedimentos", tabela_classe: "Oncologia", tabela_tipo: "Procedimentos", classe_Jaragua_do_sul: "Procedimento", classificacao_tipo: "Procedimento", finalidade: "Radioterapia", objetivo: "" },
    { id_tabela: 27, tabela: "Honorários", tabela_classe: "Oncologia", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Procedimento/Infusões", classificacao_tipo: "Honorário", finalidade: "Prescrição Oral", objetivo: "Remuneração Profissional" },
    { id_tabela: 28, tabela: "Taxas e Diárias", tabela_classe: "Geral", tabela_tipo: "Diárias", classe_Jaragua_do_sul: "Diárias", classificacao_tipo: "Diária", finalidade: "Diária Apartamento", objetivo: "Custeio Serviço" },
    { id_tabela: 29, tabela: "Taxas e Diárias", tabela_classe: "Geral", tabela_tipo: "Diárias", classe_Jaragua_do_sul: "Diárias", classificacao_tipo: "Diárias", finalidade: "Diária Enfermaria", objetivo: "Custeio Serviço" },
    { id_tabela: 30, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Honorários", classificacao_tipo: "Honorário", finalidade: "Procedimento Cirurgico", objetivo: "Remuneração Profissional" },
    { id_tabela: 35, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Honorários", classificacao_tipo: "Honorários", finalidade: "Diversos", objetivo: "Remuneração Profissional" },
    { id_tabela: 36, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consultas", classificacao_tipo: "Honorário", finalidade: "Consulta Emergência", objetivo: "Remuneração Profissional" },
    { id_tabela: 37, tabela: "Honorários", tabela_classe: "Oncologia", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Honorários", classificacao_tipo: "Honorário", finalidade: "Prescrição Terapia Subcutânea", objetivo: "Remuneração Profissional" },
    { id_tabela: 31, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consulta Multi", classificacao_tipo: "Honorários", finalidade: "Consulta Fisioterapia", objetivo: "Remuneração Profissional" },
    { id_tabela: 32, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consulta Multi", classificacao_tipo: "Honorários", finalidade: "Consulta Terapia Ocupacional", objetivo: "Remuneração Profissional" },
    { id_tabela: 33, tabela: "Honorários", tabela_classe: "Suporte", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Consulta Multi", classificacao_tipo: "Honorários", finalidade: "Consulta Fonoaudiologia", objetivo: "Remuneração Profissional" },
    { id_tabela: 34, tabela: "Gases", tabela_classe: "Suporte", tabela_tipo: "Gases", classe_Jaragua_do_sul: "Gases", classificacao_tipo: "Gases", finalidade: "Gases", objetivo: "Reembolso Serviço" },
    { id_tabela: 38, tabela: "Odontologia", tabela_classe: "Geral", tabela_tipo: "Procedimentos", classe_Jaragua_do_sul: "Procedimentos", classificacao_tipo: "Honorário", finalidade: "Procedimentos Odontologia", objetivo: "Remuneração Profissional" },
    { id_tabela: 39, tabela: "Honorários", tabela_classe: "Oncologia", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Honorários", classificacao_tipo: "Honorário", finalidade: "Pulsoterapia", objetivo: "Remuneração Profissional" },
    { id_tabela: 40, tabela: "Honorários", tabela_classe: "Oncologia", tabela_tipo: "Honorários", classe_Jaragua_do_sul: "Honorário", classificacao_tipo: "Honorário", finalidade: "Hormonioterapia", objetivo: "Remuneração Profissional" },
    { id_tabela: 41, tabela: "Medicamento Doenças Raras", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Medicamentos", objetivo: "Reembolso Serviço" },
    { id_tabela: 42, tabela: "Taxas e Diárias", tabela_classe: "Geral", tabela_tipo: "Diárias", classe_Jaragua_do_sul: "Diárias", classificacao_tipo: "Diária", finalidade: "Diária de Uti", objetivo: "Custeio Serviço" },
    { id_tabela: 43, tabela: "Suplementos", tabela_classe: "Outros", tabela_tipo: "Suplementos", classe_Jaragua_do_sul: "Suplementos", classificacao_tipo: "Suplemento", finalidade: "Suplementos", objetivo: "Reembolso Serviço" },
    { id_tabela: 44, tabela: "Medicamento Complementar Onco", tabela_classe: "Oncologia", tabela_tipo: "Material e Medicamento", classe_Jaragua_do_sul: "Medicamento", classificacao_tipo: "Medicamento", finalidade: "Medicamentos", objetivo: "Medicamentos" }
  ]
};

    // Provider do contexto
    export const DropdownOptionsProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCacheEnabled, setIsCacheEnabled] = useState(true);
    
    // Estado para armazenar todas as opções dos dropdowns
    const [dropdownOptions, setDropdownOptions] = useState({
        viaAdministracao: [],
        classeFarmaceutica: [],
        principioAtivo: [],
        armazenamento: [],
        tipoMedicamento: [],
        unidadeFracionamento: [],
        fatorConversao: [],
        taxas: [],
        tabela: []
    });

    // Função para ativar/desativar o cache
    const toggleCache = (enabled = true) => {
      setIsCacheEnabled(enabled);
      if (!enabled) {
        // Se estiver desativando o cache, limpa os dados em cache
        CacheService.removeCache(CacheService.CACHE_KEYS.DROPDOWN_OPTIONS);
      }
    };

    // Função auxiliar para buscar dados com tratamento de erro
    const fetchDataSafely = async (url, defaultData) => {
        try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Erro ao buscar ${url}: ${response.status} ${response.statusText}`);
            return { success: false, data: defaultData };
        }
        const data = await response.json();
        return { success: true, data };
        } catch (error) {
        console.warn(`Erro ao buscar ${url}:`, error);
        return { success: false, data: defaultData };
        }
    };

    // Função auxiliar para garantir que não há IDs duplicados
    const ensureUniqueIds = (array, idProperty) => {
        const idMap = new Map();
        const result = [];
        
        for (const item of array) {
        // Se o item não tiver ID ou for nulo, gere um ID aleatório grande
        if (!item[idProperty] && item[idProperty] !== 0) {
            item[idProperty] = Math.floor(Math.random() * 100000) + 50000;
        }
        
        // Se já existe um item com este ID, modifique o ID
        if (idMap.has(item[idProperty])) {
            console.warn(`ID duplicado encontrado: ${item[idProperty]}, gerando novo ID`);
            // Gera um novo ID aleatório grande para evitar conflitos
            item[idProperty] = Math.floor(Math.random() * 100000) + 50000;
            
            // Se por acaso ainda for duplicado, continue gerando até ser único
            while (idMap.has(item[idProperty])) {
            item[idProperty] = Math.floor(Math.random() * 100000) + 50000;
            }
        }
        
        // Registra o ID como usado
        idMap.set(item[idProperty], true);
        result.push(item);
        }
        
        return result;
    };
    
    // Modificar os dados estáticos para garantir IDs únicos
    const processedStaticOptions = {
        viaAdministracao: ensureUniqueIds([...staticDropdownOptions.viaAdministracao], 'idviaadministracao'),
        classeFarmaceutica: ensureUniqueIds([...staticDropdownOptions.classeFarmaceutica], 'id_medicamento'),
        principioAtivo: ensureUniqueIds([...staticDropdownOptions.principioAtivo], 'idPrincipioAtivo'),
        armazenamento: ensureUniqueIds([...staticDropdownOptions.armazenamento], 'idArmazenamento'),
        tipoMedicamento: ensureUniqueIds([...staticDropdownOptions.tipoMedicamento], 'id_medicamento'),
        unidadeFracionamento: ensureUniqueIds([...staticDropdownOptions.unidadeFracionamento], 'id_unidadefracionamento'),
        fatorConversao: ensureUniqueIds([...staticDropdownOptions.fatorConversao], 'id_fatorconversao'),
        taxas: ensureUniqueIds([...staticDropdownOptions.taxas], 'id_taxas'),
        tabela: ensureUniqueIds([...staticDropdownOptions.tabela], 'id_tabela')
    };


  // Função para carregar as opções dos dropdowns
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        setLoading(true);

        // Verifica se podemos usar dados em cache
        if (isCacheEnabled) {
          const cachedOptions = CacheService.getCachedDropdownOptions();
          if (cachedOptions) {
            console.log("Usando opções de dropdown em cache");
            setDropdownOptions(cachedOptions.data);
            setLoading(false);
            return; // Retorna cedo pois usamos o cache
          }
        }
        
        // Definir os dados iniciais com os valores estáticos processados
        const fetchedData = {
          viaAdministracao: processedStaticOptions.viaAdministracao,
          classeFarmaceutica: processedStaticOptions.classeFarmaceutica,
          principioAtivo: processedStaticOptions.principioAtivo,
          armazenamento: processedStaticOptions.armazenamento,
          tipoMedicamento: processedStaticOptions.tipoMedicamento,
          unidadeFracionamento: processedStaticOptions.unidadeFracionamento,
          fatorConversao: processedStaticOptions.fatorConversao,
          taxas: processedStaticOptions.taxas,
          tabela: processedStaticOptions.tabela          
        };
  
        // Via Administração
        const viaResult = await fetchDataSafely(
          `${API_BASE_URL}/get_via_administracao.php`,
          processedStaticOptions.viaAdministracao
        );
        if (viaResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.viaAdministracao = ensureUniqueIds(viaResult.data, 'idviaadministracao');
        }
        
        // Classe Farmacêutica
        const classeResult = await fetchDataSafely(
          `${API_BASE_URL}/get_classe_farmaceutica.php`,
          processedStaticOptions.classeFarmaceutica
        );
        if (classeResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.classeFarmaceutica = ensureUniqueIds(classeResult.data, 'id_medicamento');
        }
        
        // Princípio Ativo
        const principioResult = await fetchDataSafely(
          `${API_BASE_URL}/get_principio_ativo.php`,
          processedStaticOptions.principioAtivo
        );
        if (principioResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.principioAtivo = ensureUniqueIds(principioResult.data, 'idPrincipioAtivo');
        }
        
        // Armazenamento
        const armazenamentoResult = await fetchDataSafely(
          `${API_BASE_URL}/get_armazenamento.php`,
          processedStaticOptions.armazenamento
        );
        if (armazenamentoResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.armazenamento = ensureUniqueIds(armazenamentoResult.data, 'idArmazenamento');
        }
        
        // Tipo Medicamento
        const medicamentoResult = await fetchDataSafely(
          `${API_BASE_URL}/get_tipo_medicamento.php`,
          processedStaticOptions.tipoMedicamento
        );
        if (medicamentoResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.tipoMedicamento = ensureUniqueIds(medicamentoResult.data, 'id_medicamento');
        }
        
        // Unidade Fracionamento
        const unidadeResult = await fetchDataSafely(
          `${API_BASE_URL}/get_unidade_fracionamento.php`,
          processedStaticOptions.unidadeFracionamento
        );
        if (unidadeResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.unidadeFracionamento = ensureUniqueIds(unidadeResult.data, 'id_unidadefracionamento');
        }
        
        // Fator Conversão
        const fatorResult = await fetchDataSafely(
          `${API_BASE_URL}/get_fator_conversao.php`,
          processedStaticOptions.fatorConversao
        );
        if (fatorResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.fatorConversao = ensureUniqueIds(fatorResult.data, 'id_fatorconversao');
        }
        
        // Taxas
        const taxasResult = await fetchDataSafely(
          `${API_BASE_URL}/get_taxas.php`,
          processedStaticOptions.taxas
        );
        if (taxasResult.success) {
          // Processa os dados para garantir IDs únicos
          fetchedData.taxas = ensureUniqueIds(taxasResult.data, 'id_taxas');
        }

        const tabelaResult = await fetchDataSafely(
            `${API_BASE_URL}/get_tabela.php`,
            processedStaticOptions.tabela
          );
          if (tabelaResult.success) {
            fetchedData.tabela = ensureUniqueIds(tabelaResult.data, 'id_tabela');
          }
        
        // Atualizar o estado com os dados obtidos
        setDropdownOptions(fetchedData);

        // Armazenar em cache se o cache estiver ativado
        if (isCacheEnabled) {
          CacheService.cacheDropdownOptions(fetchedData);
        }
        
      } catch (error) {
        console.error("Erro ao carregar opções dos dropdowns:", error);
        setError(error.message);
        
        // Em caso de erro, usar os dados estáticos
        setDropdownOptions(processedStaticOptions); // Note que usamos os dados processados aqui também
      } finally {
        setLoading(false);
      }
    };
    
    fetchDropdownOptions();
  }, [isCacheEnabled]);

  // Nova função para limpar o cache manualmente
  const clearCache = () => {
    CacheService.removeCache(CacheService.CACHE_KEYS.DROPDOWN_OPTIONS);
    console.log("Cache de dropdowns limpo manualmente");
  };

  // Valores a serem disponibilizados pelo contexto
  const value = {
    dropdownOptions,
    loading,
    error,
    isCacheEnabled,
    toggleCache,
    clearCache,
    // Adicionar dados estáticos para teste/fallback
    staticOptions: staticDropdownOptions
  };

  return (
    <DropdownOptionsContext.Provider value={value}>
      {children}
    </DropdownOptionsContext.Provider>
  );
};