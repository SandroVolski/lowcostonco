// services/previasService.js
import { usePrevias } from '../context/PreviasContext';

// Original API URL remains the same
const API_URL = "https://api.lowcostonco.com.br/backend-php/api/Previas";

// Create a hook-based service that uses the context
export const usePreviasService = () => {
  const {
    getPreviasDoPatient,
    getPrevia,
    getCiclosDias,
    getAnexos,
    createPrevia,
    updatePrevia,
    uploadAnexo,
    deleteAnexo,
    loading,
    error,
    isCacheEnabled,
    dataSource
  } = usePrevias();
  
  return {
    // Expose the functions and states from the context
    getPreviasDoPatient,
    getPrevia,
    getCiclosDias,
    getAnexos,
    createPrevia,
    updatePrevia,
    uploadAnexo,
    deleteAnexo,
    loading,
    error,
    isCacheEnabled,
    dataSource
  };
};

// Keep the original service for backward compatibility
export const previasService = {
  // These methods will now be proxies that just call the API directly
  // Existing components can continue to use this
  getPreviasDoPatient: async (pacienteId) => {
    try {
      const response = await fetch(`${API_URL}/get_previas_by_paciente.php?paciente_id=${pacienteId}`);
      if (!response.ok) throw new Error('Erro ao buscar prévias do paciente');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  getPrevia: async (previaId) => {
    try {
      const response = await fetch(`${API_URL}/get_previa.php?id=${previaId}`);
      if (!response.ok) throw new Error('Erro ao buscar detalhes da prévia');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  getCiclosDias: async (previaId) => {
    try {
      const response = await fetch(`${API_URL}/get_ciclos_dias.php?previa_id=${previaId}`);
      if (!response.ok) throw new Error('Erro ao buscar ciclos/dias');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  getAnexos: async (previaId) => {
    try {
      const response = await fetch(`${API_URL}/get_anexos.php?previa_id=${previaId}`);
      if (!response.ok) throw new Error('Erro ao buscar anexos');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  createPrevia: async (dadosPrevia) => {
    try {
      const response = await fetch(`${API_URL}/create_previa.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosPrevia),
      });
      if (!response.ok) throw new Error('Erro ao criar prévia');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  updatePrevia: async (dadosPrevia) => {
    try {
      const response = await fetch(`${API_URL}/update_previa.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosPrevia),
      });
      if (!response.ok) throw new Error('Erro ao atualizar prévia');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  uploadAnexo: async (previaId, arquivo) => {
    try {
      const formData = new FormData();
      formData.append('previa_id', previaId);
      formData.append('arquivo', arquivo);
      
      const response = await fetch(`${API_URL}/upload_anexo.php`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Erro ao fazer upload de anexo');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  },
  
  deleteAnexo: async (anexoId) => {
    try {
      const response = await fetch(`${API_URL}/delete_anexo.php?id=${anexoId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao excluir anexo');
      return await response.json();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  }
};