// services/previasService.js
const API_URL = "https://api.lowcostonco.com.br/backend-php/api/previas";

export const previasService = {
  // Buscar prévias de um paciente
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
  
  // Buscar detalhes de uma prévia específica
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
  
  // Buscar ciclos/dias de uma prévia
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
  
  // Buscar anexos de uma prévia
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
  
  // Criar uma nova prévia
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
  
  // Atualizar uma prévia existente
  updatePrevia: async (dadosPrevia) => {
    try {
      const response = await fetch(`${API_URL}/update_previa.php`, {
        method: 'POST',
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
  
  // Upload de arquivo para uma prévia
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
  
  // Excluir um anexo
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