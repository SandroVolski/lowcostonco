<?php
// ARQUIVO: api/Previas/create_previa.php
// Versão atualizada com suporte ao campo titulo_atendimento

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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

    if (!$data || !isset($data['paciente_id'])) {
        throw new Exception("Dados inválidos ou ID do paciente não fornecido");
    }

    // Verificar se o ID do usuário foi fornecido
    if (!isset($data['usuario_criacao_id'])) {
        throw new Exception("ID do usuário criador não fornecido");
    }

    // Obter o próximo número sequencial para este paciente
    $seqQuery = "SELECT MAX(numero_sequencial) as max_seq FROM previas WHERE paciente_id = ?";
    $seqStmt = $conn_pacientes->prepare($seqQuery);
    if (!$seqStmt) {
        throw new Exception("Erro ao preparar query de sequencial: " . $conn_pacientes->error);
    }
    
    $seqStmt->bind_param("i", $data['paciente_id']);
    $seqStmt->execute();
    $seqResult = $seqStmt->get_result();
    $seqRow = $seqResult->fetch_assoc();

    $numeroSequencial = ($seqRow['max_seq'] ?? 0) + 1;
    $codigoComposto = $data['paciente_id'] . '-' . str_pad($numeroSequencial, 3, '0', STR_PAD_LEFT);

    // PROCESSAR E VALIDAR MÚLTIPLOS REGISTROS DE PARECER (MÁXIMO 5)
    $parecerRegistrosJSON = null;
    $registrosValidos = [];
    
    if (isset($data['parecer_registros']) && is_array($data['parecer_registros'])) {
        // VALIDAR LIMITE MÁXIMO
        if (count($data['parecer_registros']) > 5) {
            throw new Exception("Limite máximo de 5 registros de parecer excedido.");
        }
        
        // Limpar registros vazios e validar
        foreach ($data['parecer_registros'] as $index => $registro) {
            if (!empty($registro['parecer']) || !empty($registro['parecerGuia']) || !empty($registro['finalizacao'])) {
                // CORREÇÃO: Criar registro com valores iniciais corretos
                $registroLimpo = [
                    'id' => $registro['id'] ?? ($index + 1),
                    'parecer' => isset($registro['parecer']) ? substr(trim($registro['parecer']), 0, 1000) : '',
                    'parecerGuia' => '', // Será preenchido abaixo se válido
                    'finalizacao' => '', // Será preenchido abaixo se válido
                    'dataSolicitacao' => '',
                    'dataParecer' => '',
                    'tempoAnalise' => null,
                    'observacoes' => isset($registro['observacoes']) ? substr(trim($registro['observacoes']), 0, 500) : '',
                    
                    // NOVO: Informações do usuário para cada registro
                    'usuario_criacao_id' => $data['usuario_criacao_id'],
                    'usuario_criacao' => null, // Será preenchido quando buscarmos do banco
                    'data_criacao' => date('Y-m-d H:i:s'),
                    'usuario_alteracao_id' => null,
                    'usuario_alteracao' => null,
                    'data_atualizacao' => null
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
        
        // Buscar nome do usuário criador
        if (!empty($registrosValidos) && isset($data['usuario_criacao_id'])) {
            $userQuery = "SELECT nome FROM usuarios WHERE id = ?";
            $userStmt = $conn_pacientes->prepare($userQuery);
            $userStmt->bind_param("i", $data['usuario_criacao_id']);
            $userStmt->execute();
            $userResult = $userStmt->get_result();
            
            if ($userResult->num_rows > 0) {
                $userData = $userResult->fetch_assoc();
                $nomeUsuario = $userData['nome'];
                
                // Atualizar todos os registros com o nome do usuário
                foreach ($registrosValidos as &$registro) {
                    $registro['usuario_criacao'] = $nomeUsuario;
                }
            }
            $userStmt->close();
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

    // Preparar a inserção da prévia - INCLUINDO titulo_atendimento
    $sql = "INSERT INTO previas (
        paciente_id, 
        numero_sequencial, 
        codigo_composto,
        titulo_atendimento,
        guia, 
        protocolo, 
        cid,
        ciclos_previstos,
        data_emissao_guia,
        data_encaminhamento_af,
        data_solicitacao, 
        parecer,
        comentario,
        peso, 
        altura, 
        parecer_guia, 
        finalizacao,
        inconsistencia, 
        data_parecer_registrado, 
        tempo_analise,
        parecer_registros,
        usuario_criacao_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

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
    $dataParecerRegistrado = $primeiroRegistro ? convertDateToMysql($primeiroRegistro['dataParecer']) : null;

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
        "iisssssisssssddssssisi",
        $data['paciente_id'],          // i
        $numeroSequencial,             // i  
        $codigoComposto,               // s
        $tituloAtendimento,            // s - NOVO CAMPO
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
        $data['usuario_criacao_id']    // i
    );

    if (!$stmt->execute()) {
        throw new Exception("Erro ao executar INSERT: " . $stmt->error);
    }

    $previaId = $conn_pacientes->insert_id;

    // Inserir ciclos/dias da prévia
    if (isset($data['ciclos_dias']) && is_array($data['ciclos_dias'])) {
        $cicloSql = "INSERT INTO previa_ciclos_dias (
            previa_id, 
            ciclo, 
            dia, 
            protocolo, 
            is_full_cycle
        ) VALUES (?, ?, ?, ?, ?)";

        $cicloStmt = $conn_pacientes->prepare($cicloSql);
        if (!$cicloStmt) {
            throw new Exception("Erro ao preparar statement de ciclos: " . $conn_pacientes->error);
        }

        foreach ($data['ciclos_dias'] as $cicloDia) {
            $isFullCycle = isset($cicloDia['fullCycle']) ? (int)$cicloDia['fullCycle'] : 0;

            $cicloStmt->bind_param(
                "isssi",
                $previaId,
                $cicloDia['ciclo'],
                $cicloDia['dia'],
                $cicloDia['protocolo'],
                $isFullCycle
            );

            if (!$cicloStmt->execute()) {
                throw new Exception("Erro ao inserir ciclo/dia: " . $cicloStmt->error);
            }
        }
    }

    // Commit da transação
    $conn_pacientes->commit();

    http_response_code(201);
    echo json_encode([
        "message" => "Prévia criada com sucesso",
        "id" => $previaId,
        "codigo_composto" => $codigoComposto,
        "numero_sequencial" => $numeroSequencial,
        "titulo_atendimento" => $tituloAtendimento,
        "parecer_registros_count" => count($registrosValidos ?? []),
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