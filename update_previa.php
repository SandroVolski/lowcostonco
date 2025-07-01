<?php
// ARQUIVO: api/Previas/update_previa.php
// Versão atualizada com suporte ao campo titulo_atendimento

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    include_once("../../config.php");
    
    // Verificar se a conexão existe
    if (!isset($conn_pacientes) || $conn_pacientes->connect_error) {
        throw new Exception("Erro na conexão com o banco de dados");
    }
    
    // Iniciar transação
    $conn_pacientes->begin_transaction();
    
    // Obter dados do corpo da requisição
    $input = file_get_contents("php://input");
    if (!$input) {
        throw new Exception("Nenhum dado recebido");
    }
    
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Dados JSON inválidos: " . json_last_error_msg());
    }
    
    if (!$data || !isset($data['id'])) {
        throw new Exception("Dados inválidos ou ID da prévia não fornecido");
    }
    
    // Verificar se o ID do usuário foi fornecido
    if (!isset($data['usuario_alteracao_id'])) {
        throw new Exception("ID do usuário que está alterando não fornecido");
    }

    // PROCESSAR E VALIDAR MÚLTIPLOS REGISTROS DE PARECER (MÁXIMO 5)
    $parecerRegistrosJSON = null;
    $registrosValidos = [];
    
    if (isset($data['parecer_registros']) && is_array($data['parecer_registros'])) {
        if (count($data['parecer_registros']) > 5) {
            throw new Exception("Limite máximo de 5 registros de parecer excedido.");
        }
        
        // Buscar registros existentes para preservar informações de usuário
        $existingRegistrosQuery = "SELECT parecer_registros FROM previas WHERE id = ?";
        $existingStmt = $conn_pacientes->prepare($existingRegistrosQuery);
        $existingStmt->bind_param("i", $data['id']);
        $existingStmt->execute();
        $existingResult = $existingStmt->get_result();
        
        $existingRegistros = [];
        if ($existingResult->num_rows > 0) {
            $existingData = $existingResult->fetch_assoc();
            if (!empty($existingData['parecer_registros'])) {
                $existingRegistros = json_decode($existingData['parecer_registros'], true) ?: [];
            }
        }
        $existingStmt->close();
        
        // Buscar nome do usuário que está alterando
        $nomeUsuarioAlteracao = null;
        $userQuery = "SELECT nome FROM usuarios WHERE id = ?";
        $userStmt = $conn_pacientes->prepare($userQuery);
        $userStmt->bind_param("i", $data['usuario_alteracao_id']);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        
        if ($userResult->num_rows > 0) {
            $userData = $userResult->fetch_assoc();
            $nomeUsuarioAlteracao = $userData['nome'];
        }
        $userStmt->close();
        
        // Limpar registros vazios e validar
        foreach ($data['parecer_registros'] as $index => $registro) {
            if (!empty($registro['parecer']) || !empty($registro['parecerGuia']) || !empty($registro['finalizacao'])) {
                
                // Buscar registro existente para preservar informações de criação
                $existingRegistro = null;
                foreach ($existingRegistros as $existing) {
                    if ($existing['id'] == $registro['id']) {
                        $existingRegistro = $existing;
                        break;
                    }
                }
                
                $registroLimpo = [
                    'id' => $registro['id'] ?? ($index + 1),
                    'parecer' => isset($registro['parecer']) ? substr(trim($registro['parecer']), 0, 1000) : '',
                    'parecerGuia' => '', // Será preenchido abaixo se válido
                    'finalizacao' => '', // Será preenchido abaixo se válido
                    'dataSolicitacao' => '',
                    'dataParecer' => '',
                    'tempoAnalise' => null,
                    'observacoes' => isset($registro['observacoes']) ? substr(trim($registro['observacoes']), 0, 500) : '',
                    
                    // PRESERVAR informações de criação ou criar novas
                    'usuario_criacao_id' => $existingRegistro['usuario_criacao_id'] ?? $data['usuario_alteracao_id'],
                    'usuario_criacao' => $existingRegistro['usuario_criacao'] ?? $nomeUsuarioAlteracao,
                    'data_criacao' => $existingRegistro['data_criacao'] ?? date('Y-m-d H:i:s'),
                    
                    // ATUALIZAR informações de alteração
                    'usuario_alteracao_id' => $data['usuario_alteracao_id'],
                    'usuario_alteracao' => $nomeUsuarioAlteracao,
                    'data_atualizacao' => date('Y-m-d H:i:s')
                ];
                
                // CORREÇÃO: Validar e preencher parecerGuia
                if (!empty($registro['parecerGuia']) && 
                    in_array($registro['parecerGuia'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
                    $registroLimpo['parecerGuia'] = $registro['parecerGuia'];
                }
                
                // CORREÇÃO: Validar e preencher finalizacao
                if (!empty($registro['finalizacao']) && 
                    in_array($registro['finalizacao'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
                    $registroLimpo['finalizacao'] = $registro['finalizacao'];
                }
                
                // Validar e preencher outros campos
                if (!empty($registro['dataSolicitacao']) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $registro['dataSolicitacao'])) {
                    $registroLimpo['dataSolicitacao'] = $registro['dataSolicitacao'];
                } else if (!empty($data['data_solicitacao'])) {
                    $registroLimpo['dataSolicitacao'] = $data['data_solicitacao'];
                }
                
                if (!empty($registro['dataParecer']) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $registro['dataParecer'])) {
                    $registroLimpo['dataParecer'] = $registro['dataParecer'];
                }
                
                if (isset($registro['tempoAnalise']) && is_numeric($registro['tempoAnalise']) && $registro['tempoAnalise'] >= 0) {
                    $registroLimpo['tempoAnalise'] = intval($registro['tempoAnalise']);
                }
                
                $registrosValidos[] = $registroLimpo;
            }
        }
        
        // Se há registros válidos, converter para JSON
        if (!empty($registrosValidos)) {
            $parecerRegistrosJSON = json_encode($registrosValidos, JSON_UNESCAPED_UNICODE);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Erro ao processar registros de parecer: " . json_last_error_msg());
            }
        }
    }

    // Processar dados para compatibilidade com campos existentes
    $primeiroRegistro = null;
    if (!empty($registrosValidos)) {
        $primeiroRegistro = $registrosValidos[0];
    }
    
    // Preparar a atualização da prévia - INCLUINDO titulo_atendimento
    $sql = "UPDATE previas SET
        titulo_atendimento = ?,
        guia = ?, 
        protocolo = ?, 
        cid = ?,
        ciclos_previstos = ?,
        data_emissao_guia = ?,
        data_encaminhamento_af = ?,
        data_solicitacao = ?, 
        parecer = ?,
        comentario = ?,
        peso = ?, 
        altura = ?, 
        parecer_guia = ?, 
        finalizacao = ?,
        inconsistencia = ?, 
        data_parecer_registrado = ?, 
        tempo_analise = ?,
        parecer_registros = ?,
        usuario_alteracao_id = ?,
        data_atualizacao = NOW()
    WHERE id = ?";
    
    $stmt = $conn_pacientes->prepare($sql);
    if (!$stmt) {
        throw new Exception("Erro ao preparar statement: " . $conn_pacientes->error);
    }
    
    // Função helper para converter data DD/MM/YYYY para YYYY-MM-DD
    function convertDateToMysql($dateString) {
        if (!$dateString || empty($dateString)) {
            return NULL;
        }
        $dateParts = explode('/', $dateString);
        if (count($dateParts) === 3) {
            return $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0];
        }
        return NULL;
    }
    
    // Converter as datas para formato MySQL
    $dataEmissaoGuia = convertDateToMysql($data['data_emissao_guia'] ?? '');
    $dataEncaminhamentoAF = convertDateToMysql($data['data_encaminhamento_af'] ?? '');
    $dataSolicitacao = convertDateToMysql($data['data_solicitacao'] ?? '');
    $dataParecerRegistrado = $primeiroRegistro ? convertDateToMysql($primeiroRegistro['dataParecer']) : convertDateToMysql($data['data_parecer_registrado'] ?? '');

    // Processar ciclos_previstos (pode ser null)
    $ciclosPrevistos = null;
    if (isset($data['ciclos_previstos']) && !empty($data['ciclos_previstos'])) {
        $ciclosPrevistos = intval($data['ciclos_previstos']);
    }

    // NOVO: Processar titulo_atendimento
    $tituloAtendimento = '';
    if (isset($data['titulo_atendimento']) && is_string($data['titulo_atendimento'])) {
        $tituloAtendimento = substr(trim($data['titulo_atendimento']), 0, 100); // Limitar a 100 caracteres
    }

    // Usar dados do primeiro registro para campos de compatibilidade
    $parecerCompat = $primeiroRegistro['parecer'] ?? ($data['parecer'] ?? '');
    $parecerGuiaCompat = null;
    $finalizacaoCompat = null;
    $tempoAnaliseCompat = null;

    if ($primeiroRegistro) {
        if (!empty($primeiroRegistro['parecerGuia'])) {
            $parecerGuiaCompat = $primeiroRegistro['parecerGuia'];
        }
        if (!empty($primeiroRegistro['finalizacao'])) {
            $finalizacaoCompat = $primeiroRegistro['finalizacao'];
        }
        $tempoAnaliseCompat = $primeiroRegistro['tempoAnalise'];
    } else {
        // Fallback para campos antigos se não há registros múltiplos
        if (isset($data['parecer_guia']) && !empty($data['parecer_guia']) && 
            in_array($data['parecer_guia'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
            $parecerGuiaCompat = $data['parecer_guia'];
        }
        if (isset($data['finalizacao']) && !empty($data['finalizacao']) && 
            in_array($data['finalizacao'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
            $finalizacaoCompat = $data['finalizacao'];
        }
        $tempoAnaliseCompat = $data['tempo_analise'] ?? null;
    }
    
    // Validação para inconsistencia
    $inconsistencia = NULL;
    if (isset($data['inconsistencia']) && !empty($data['inconsistencia'])) {
        if (in_array($data['inconsistencia'], ['Completa', 'Dados Faltantes', 'Requer Análise', 'Informações Inconsistentes'])) {
            $inconsistencia = $data['inconsistencia'];
        }
    }
    
    // BIND dos parâmetros incluindo titulo_atendimento
    $stmt->bind_param(
        "sssisssssddssssisii",
        $tituloAtendimento,            // s - NOVO CAMPO (primeiro na query)
        $data['guia'],                 // s
        $data['protocolo'],            // s
        $data['cid'],                  // s
        $ciclosPrevistos,              // i
        $dataEmissaoGuia,              // s
        $dataEncaminhamentoAF,         // s
        $dataSolicitacao,              // s
        $parecerCompat,                // s
        $data['comentario'],           // s
        $data['peso'],                 // d
        $data['altura'],               // d
        $parecerGuiaCompat,            // s
        $finalizacaoCompat,            // s
        $inconsistencia,               // s
        $dataParecerRegistrado,        // s
        $tempoAnaliseCompat,           // i
        $parecerRegistrosJSON,         // s
        $data['usuario_alteracao_id'], // i
        $data['id']                    // i (WHERE id = ?)
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Erro ao executar UPDATE: " . $stmt->error);
    }
    
    // Atualizar ciclos/dias
    if (isset($data['ciclos_dias']) && is_array($data['ciclos_dias'])) {
        // Primeiro, excluir os ciclos existentes
        $deleteQuery = "DELETE FROM previa_ciclos_dias WHERE previa_id = ?";
        $deleteStmt = $conn_pacientes->prepare($deleteQuery);
        if (!$deleteStmt) {
            throw new Exception("Erro ao preparar DELETE de ciclos: " . $conn_pacientes->error);
        }
        
        $deleteStmt->bind_param("i", $data['id']);
        if (!$deleteStmt->execute()) {
            throw new Exception("Erro ao deletar ciclos existentes: " . $deleteStmt->error);
        }
        
        // Depois, inserir os novos
        $cicloSql = "INSERT INTO previa_ciclos_dias (
            previa_id, 
            ciclo, 
            dia, 
            protocolo, 
            is_full_cycle
        ) VALUES (?, ?, ?, ?, ?)";
        
        $cicloStmt = $conn_pacientes->prepare($cicloSql);
        if (!$cicloStmt) {
            throw new Exception("Erro ao preparar INSERT de ciclos: " . $conn_pacientes->error);
        }
        
        foreach ($data['ciclos_dias'] as $cicloDia) {
            $isFullCycle = isset($cicloDia['fullCycle']) ? (int)$cicloDia['fullCycle'] : 0;
            
            $cicloStmt->bind_param(
                "isssi",
                $data['id'],
                $cicloDia['ciclo'],
                $cicloDia['dia'],
                $cicloDia['protocolo'],
                $isFullCycle
            );
            
            if (!$cicloStmt->execute()) {
                throw new Exception("Erro ao inserir novo ciclo: " . $cicloStmt->error);
            }
        }
    }
    
    // Commit da transação
    $conn_pacientes->commit();
    
    http_response_code(200);
    echo json_encode([
        "message" => "Prévia atualizada com sucesso",
        "id" => $data['id'],
        "titulo_atendimento" => $tituloAtendimento,
        "parecer_registros_count" => count($registrosValidos),
        "parecer_registros_limit" => 5,
        "data_compatibility" => [
            "parecer_primary" => $parecerCompat,
            "parecer_guia_primary" => $parecerGuiaCompat,
            "finalizacao_primary" => $finalizacaoCompat
        ],
        "enhanced_features" => [
            "titulo_atendimento_support" => true,
            "data_solicitacao_support" => true,
            "auto_date_calculation" => true,
            "improved_time_analysis" => true
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback em caso de erro
    if (isset($conn_pacientes) && !$conn_pacientes->connect_error) {
        $conn_pacientes->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        "error" => $e->getMessage(),
        "file" => __FILE__,
        "line" => $e->getLine()
    ]);
}

if (isset($conn_pacientes)) {
    $conn_pacientes->close();
}
?> 